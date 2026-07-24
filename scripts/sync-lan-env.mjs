import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDirectory, '..');
const projectsRoot = resolve(appRoot, '..');
const webRoot = join(projectsRoot, 'fams-front-web-project');
const backendRoot = join(projectsRoot, 'fams-backend-project');

const args = process.argv.slice(2);
const ipArgumentIndex = args.indexOf('--ip');
const requestedIp = ipArgumentIndex >= 0 ? args[ipArgumentIndex + 1] : undefined;
const syncEas = args.includes('--eas');
const dryRun = args.includes('--dry-run');

function isValidIpv4(value) {
  if (!value) return false;
  const parts = value.split('.');
  return parts.length === 4
    && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

function addressRank(name, address) {
  const virtualInterface = /docker|br-|veth|virbr|podman|tailscale/i.test(name) ? 20 : 0;
  if (address.startsWith('192.168.')) return virtualInterface;
  if (address.startsWith('10.')) return virtualInterface + 1;
  const second = Number(address.split('.')[1]);
  if (address.startsWith('172.') && second >= 16 && second <= 31) return virtualInterface + 2;
  return virtualInterface + 10;
}

function detectLanIp() {
  let candidates = [];
  try {
    candidates = Object.entries(networkInterfaces())
      .flatMap(([name, addresses]) => (addresses || []).map((address) => ({ name, ...address })))
      .filter((address) => address.family === 'IPv4' && !address.internal)
      .sort((left, right) => addressRank(left.name, left.address) - addressRank(right.name, right.address));
  } catch {
    // Some WSL/sandbox environments block libuv from enumerating adapters.
    // Fall through to OS commands below instead of exposing a low-level error.
  }

  if (candidates[0]?.address) return candidates[0].address;

  const ipResult = spawnSync('ip', ['-o', '-4', 'addr', 'show', 'scope', 'global'], {
    encoding: 'utf8',
  });
  if (ipResult.status === 0) {
    const addresses = ipResult.stdout
      .split('\n')
      .flatMap((line) => [...line.matchAll(/\binet\s+(\d+\.\d+\.\d+\.\d+)\//g)])
      .map((match) => match[1])
      .filter(isValidIpv4);
    if (addresses[0]) return addresses[0];
  }

  const hostnameResult = spawnSync('hostname', ['-I'], { encoding: 'utf8' });
  if (hostnameResult.status === 0) {
    const hostnameIp = hostnameResult.stdout.split(/\s+/).find(isValidIpv4);
    if (hostnameIp) return hostnameIp;
  }

  const appEnvPath = join(appRoot, '.env');
  if (existsSync(appEnvPath)) {
    const currentApiUrl = readFileSync(appEnvPath, 'utf8')
      .split(/\r?\n/)
      .find((line) => line.startsWith('EXPO_PUBLIC_API_URL='))
      ?.slice('EXPO_PUBLIC_API_URL='.length);
    const configuredIp = currentApiUrl?.match(/^https?:\/\/(\d+\.\d+\.\d+\.\d+)(?::|\/)/)?.[1];
    if (isValidIpv4(configuredIp)) {
      console.warn(
        `Không đọc được card mạng; tạm giữ IP hiện tại ${configuredIp}. `
        + 'Nếu vừa đổi Wi-Fi, hãy thêm --ip <địa_chỉ_IP_mới>.',
      );
      return configuredIp;
    }
  }

  return undefined;
}

function updateEnvFile(filePath, values) {
  if (!existsSync(filePath)) {
    throw new Error(`Không tìm thấy file môi trường: ${filePath}`);
  }

  const original = readFileSync(filePath, 'utf8');
  const hadFinalNewline = original.endsWith('\n');
  const lines = original.split(/\r?\n/);

  for (const [key, value] of Object.entries(values)) {
    const lineIndex = lines.findIndex((line) => line.startsWith(`${key}=`));
    if (lineIndex >= 0) {
      lines[lineIndex] = `${key}=${value}`;
    } else {
      if (lines.length > 0 && lines.at(-1) !== '') lines.push('');
      lines.push(`${key}=${value}`);
    }
  }

  let updated = lines.join('\n');
  if (hadFinalNewline && !updated.endsWith('\n')) updated += '\n';
  if (!dryRun && updated !== original) writeFileSync(filePath, updated, 'utf8');

  return updated !== original;
}

if (requestedIp && !isValidIpv4(requestedIp)) {
  throw new Error(`IP không hợp lệ: ${requestedIp}`);
}

const lanIp = requestedIp || detectLanIp();
if (!isValidIpv4(lanIp)) {
  throw new Error('Không tự phát hiện được IPv4 LAN. Hãy chạy lại với --ip <địa_chỉ_IP>.');
}

const apiUrl = `http://${lanIp}:8080/api/v1`;
const frontendUrl = `http://${lanIp}:3000`;
const backendUrl = `http://${lanIp}:8080`;
const avatarUrl = `http://${lanIp}:9000/fams-avatars`;

const targets = [
  {
    label: 'Expo app',
    path: join(appRoot, '.env'),
    values: { EXPO_PUBLIC_API_URL: apiUrl },
  },
  {
    label: 'Next.js web',
    path: join(webRoot, '.env.local'),
    values: { FAMS_DEV_ORIGINS: `${lanIp},localhost,127.0.0.1` },
  },
  {
    label: 'Spring backend',
    path: join(backendRoot, '.env'),
    values: {
      APP_BASE_URL: backendUrl,
      APP_FRONTEND_URL: frontendUrl,
      S3_PUBLIC_URL: avatarUrl,
    },
  },
];

console.log(`${dryRun ? '[DRY RUN] ' : ''}IP LAN: ${lanIp}`);
for (const target of targets) {
  const changed = updateEnvFile(target.path, target.values);
  console.log(`${changed ? '✓' : '•'} ${target.label}: ${changed ? 'đã đồng bộ' : 'đã đúng'}`);
}
console.log(`  API app: ${apiUrl}`);
console.log(`  Link email: ${frontendUrl}`);
console.log(`  Avatar: ${avatarUrl}`);

if (syncEas && !dryRun) {
  console.log('Đang đồng bộ EXPO_PUBLIC_API_URL lên EAS development...');
  const result = spawnSync(
    'npx',
    [
      'eas-cli',
      'env:set',
      'development',
      '--name',
      'EXPO_PUBLIC_API_URL',
      '--value',
      apiUrl,
      '--type',
      'string',
      '--visibility',
      'plaintext',
      '--scope',
      'project',
      '--non-interactive',
    ],
    { cwd: appRoot, stdio: 'inherit' },
  );
  if (result.status !== 0) {
    throw new Error('Không thể cập nhật EAS environment. Kiểm tra đăng nhập/quyền EAS rồi thử lại.');
  }
}

console.log('\nSau khi đổi IP, hãy khởi động lại backend, Next.js và Metro để nạp cấu hình mới.');
console.log('Lệnh thường dùng: npm run start:dev-client:lan (app) và npm run dev (web).');

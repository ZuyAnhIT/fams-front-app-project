import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backendRoot = resolve(projectRoot, '..', 'fams-backend-project');

function readEnv(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [
          line.slice(0, separator).trim(),
          line.slice(separator + 1).trim(),
        ];
      }),
  );
}

const frontendEnv = readEnv(resolve(projectRoot, '.env'));
const backendEnv = readEnv(resolve(backendRoot, '.env'));
const appConfig = JSON.parse(readFileSync(resolve(projectRoot, 'app.json'), 'utf8')).expo;
const firebasePath = resolve(projectRoot, 'google-services.json');
const failures = [];
const warnings = [];

if (appConfig.android?.package !== 'com.fams.mobile') {
  failures.push(`Android package phải là com.fams.mobile, hiện là ${appConfig.android?.package}`);
}

if (!existsSync(firebasePath)) {
  failures.push('Thiếu google-services.json ở root frontend.');
} else {
  const firebase = JSON.parse(readFileSync(firebasePath, 'utf8'));
  const clients = (firebase.client ?? []).filter(
    (client) =>
      client.client_info?.android_client_info?.package_name ===
      appConfig.android?.package,
  );
  if (clients.length === 0) {
    failures.push('google-services.json không có client khớp com.fams.mobile.');
  }
  const oauthClients = clients.flatMap((client) => client.oauth_client ?? []);
  if (oauthClients.length === 0) {
    warnings.push(
      'google-services.json không chứa OAuth client. Nếu Google OAuth dùng Cloud project riêng, hãy kiểm tra thủ công Android OAuth client có đúng package + SHA-1.',
    );
  }
  console.log(`Firebase project: ${firebase.project_info?.project_id ?? 'unknown'}`);
}

const frontendGoogleClientId = frontendEnv.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const backendGoogleClientId = backendEnv.GOOGLE_CLIENT_ID;
if (!frontendGoogleClientId) {
  failures.push('Thiếu EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID trong frontend .env.');
} else if (backendGoogleClientId && frontendGoogleClientId !== backendGoogleClientId) {
  failures.push('Google Web Client ID frontend không khớp GOOGLE_CLIENT_ID backend.');
}

console.log(`Android package: ${appConfig.android?.package ?? 'missing'}`);
console.log(`Google audience: ${frontendGoogleClientId ?? 'missing'}`);
console.log(`API URL: ${frontendEnv.EXPO_PUBLIC_API_URL ?? 'missing'}`);

for (const warning of warnings) console.warn(`WARN: ${warning}`);
for (const failure of failures) console.error(`FAIL: ${failure}`);

if (failures.length > 0) process.exit(1);
console.log('PASS: Cấu hình local đủ điều kiện để tiếp tục kiểm tra credential/build native.');

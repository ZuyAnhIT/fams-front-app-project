import assert from 'node:assert/strict';
import test from 'node:test';

import type { MyRoleAssignment } from '../src/features/rbac/api';
import { hasTenantPermission, hasTenantRole } from '../src/features/rbac/permissions';

function role(overrides: Partial<MyRoleAssignment>): MyRoleAssignment {
  return {
    id: 'role-1',
    userId: 'user-1',
    roleId: 'role-type-1',
    roleName: 'SITE_SUPERVISOR',
    tenantId: 'tenant-a',
    assignedAt: '2026-08-19T00:00:00Z',
    permissions: ['sites:list'],
    ...overrides,
  };
}

test('tenant role checks never leak a role from another tenant or a global role', () => {
  const roles = [role({ tenantId: 'tenant-a' }), role({ id: 'global', tenantId: null })];
  assert.equal(hasTenantRole(roles, 'tenant-a', 'SITE_SUPERVISOR'), true);
  assert.equal(hasTenantRole(roles, 'tenant-b', 'SITE_SUPERVISOR'), false);
  assert.equal(hasTenantRole(roles, null, 'SITE_SUPERVISOR'), false);
});

test('tenant permission checks reject another tenant but preserve global permissions', () => {
  const roles = [
    role({ tenantId: 'tenant-a', permissions: ['sites:list'] }),
    role({ id: 'role-2', tenantId: 'tenant-b', permissions: ['assignments:list'] }),
    role({ id: 'global', tenantId: null, permissions: ['reports:read'] }),
  ];
  assert.equal(hasTenantPermission(roles, 'tenant-a', ['sites:list']), true);
  assert.equal(hasTenantPermission(roles, 'tenant-a', ['assignments:list']), false);
  assert.equal(hasTenantPermission(roles, 'tenant-a', ['reports:read']), true);
});

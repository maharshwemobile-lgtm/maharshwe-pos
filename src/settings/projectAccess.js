import { getSession } from '../phase2Api';

export function currentUser() {
  return getSession()?.user || null;
}

export function isProjectAdmin(user = currentUser()) {
  return user?.role === 'SUPER_ADMIN' || user?.role === 'SHOP_ADMIN';
}

export function hasPermission(permission, fallback = false, user = currentUser()) {
  if (!user) return fallback;
  if (isProjectAdmin(user)) return true;
  const permissions = user.permissions || {};
  if (typeof permissions[permission] === 'boolean') return permissions[permission];
  return fallback;
}

export function canViewTab(tabName, fallback = true, user = currentUser()) {
  return hasPermission(`tab.${tabName}`, fallback, user);
}

export function canAny(permissions, fallback = false, user = currentUser()) {
  return permissions.some((permission) => hasPermission(permission, false, user)) || fallback;
}

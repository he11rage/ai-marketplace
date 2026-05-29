export const USER_ROLES = {
  BUYER: 'buyer',
  SELLER: 'seller',
  ADMIN: 'admin',
};

export const ROLE_LABELS = {
  [USER_ROLES.BUYER]: 'Покупатель',
  [USER_ROLES.SELLER]: 'Продавец',
  [USER_ROLES.ADMIN]: 'Администратор',
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || 'Пользователь';
}

export function isAdmin(user) {
  if (!user) return false;
  return user.role === USER_ROLES.ADMIN || Boolean(user.is_admin) || Boolean(user.is_staff);
}

export function isSeller(user) {
  if (!user) return false;
  return user.role === USER_ROLES.SELLER || isAdmin(user);
}

export function isBuyer(user) {
  if (!user) return false;
  return [USER_ROLES.BUYER, USER_ROLES.SELLER, USER_ROLES.ADMIN].includes(user.role);
}

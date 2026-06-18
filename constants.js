// Shared constants for MaharShwe POS

export const ADMIN_PERMISSIONS = {
  sale: true,
  history: true,
  discount: true,
  editSale: true,
  deleteSale: true,
  inventory: true,
  accounting: true,
  settings: true,
};

export const CASHIER_PERMISSIONS = {
  sale: true,
  history: true,
  discount: false,
  editSale: false,
  deleteSale: false,
};

export const FIXED_TECHNICIANS = [
  { name: 'Khun Lwin OO', chatId: '5386894413' },
  { name: 'Khun Mg Ponn', chatId: '6730666866' },
  { name: 'Sayar San', chatId: '8035358430' },
  { name: 'Ba Mg', chatId: '8731433727' },
  { name: 'KMA', chatId: '8128573692' },
];

export const ROLES = {
  ADMIN: 'Admin',
  CASHIER: 'Cashier',
};

export const LOGIN_TYPES = {
  TELEGRAM: 'Telegram WebApp',
  USERNAME_PASSWORD: 'Username Password',
};

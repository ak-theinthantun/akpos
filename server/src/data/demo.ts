export const demoUsers = [
  {
    id: 'u1',
    name: 'Admin User',
    username: 'admin',
    password: '1234',
    role: 'admin',
  },
  {
    id: 'u2',
    name: 'Staff One',
    username: 'staff',
    password: '1234',
    role: 'staff',
  },
];

export const demoChanges = {
  users: demoUsers.map(({ password, ...user }) => user),
  settings: [
    { key: 'shopName', value: 'AKPOS', updatedAt: new Date().toISOString() },
  ],
  categories: [],
  units: [],
  customers: [
    { id: 'cust1', name: 'Ko Aung', phone: '09-123-456', type: 'regular', active: true },
    { id: 'cust2', name: 'Ma Hnin', phone: '09-234-567', type: 'wholesale', active: true },
  ],
  suppliers: [],
  products: [
    { id: 'p1', name: 'Coca Cola 330ml', price: 500, wholesalePrice: 450, costPrice: 350, currentStock: 120, active: true },
    { id: 'p4', name: 'Lays Chips', price: 600, wholesalePrice: 540, costPrice: 420, currentStock: 60, active: true },
  ],
  productVariantTypes: [],
  productVariantOptions: [],
  coupons: [],
  daySessions: [],
  sales: [],
  salePayments: [],
  supplierVouchers: [],
  supplierVoucherItems: [],
  supplierVoucherCosts: [],
  supplierPayments: [],
  stockMovements: [],
};

export function getBaseDemoChanges() {
  return {
    ...demoChanges,
    sales: [...demoChanges.sales],
  };
}

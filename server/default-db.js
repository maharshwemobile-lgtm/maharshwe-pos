const bcrypt = require('bcryptjs');

function makeDefaultDb() {
  const adminPassword = String(process.env.ADMIN_PASSWORD || '');
  if (adminPassword.length < 12) throw new Error('ADMIN_PASSWORD must be set with at least 12 characters before creating a fresh database');
  const adminHash = bcrypt.hashSync(adminPassword, 12);
  return {
    users: [
      {
        id: 'u_admin',
        username: 'admin',
        password_hash: adminHash,
        name: 'Admin',
        role: 'Admin',
        permissions: {
          sale: true,
          history: true,
          discount: true,
          editSale: true,
          deleteSale: true,
          inventory: true,
          accounting: true,
          settings: true,
          purchase: true,
          backup: true,
          users: true
        },
        active: 1,
        created_at: new Date().toISOString()
      }
    ],
    products: [
      { id: 'p1', brand: 'Samsung', model: 'Galaxy S24', specs: '8GB/256GB', color: 'Phantom Black', category: 'New Phone', costPrice: 850000, sellingPrice: 950000, stockQty: 5, barcode: '880609124', reorderLevel: 2 },
      { id: 'p2', brand: 'Apple', model: 'iPhone 14 Pro Max', specs: '256GB', color: 'Deep Purple', category: 'New Phone', costPrice: 1500000, sellingPrice: 1700000, stockQty: 3, barcode: '194253002589', reorderLevel: 1 },
      { id: 'p3', brand: 'Samsung', model: 'Galaxy S23', specs: '8GB/128GB', color: 'Cream', category: 'Used Phone', costPrice: 600000, sellingPrice: 750000, stockQty: 2, barcode: '88060912', reorderLevel: 1 },
      { id: 'p4', brand: 'Generic', model: 'USB-C Cable 1m', specs: 'Fast Charge', color: 'Black', category: 'Accessories', costPrice: 3000, sellingPrice: 6000, stockQty: 20, barcode: 'ACC001', reorderLevel: 5 },
      { id: 'p5', brand: 'Generic', model: 'Tempered Glass', specs: 'Samsung S24', color: 'Clear', category: 'Accessories', costPrice: 1500, sellingPrice: 4000, stockQty: 15, barcode: 'ACC002', reorderLevel: 5 },
      { id: 'p6', brand: 'VPN', model: 'Outline VPN 1 Month', specs: 'Unlimited', color: '', category: 'VPN Service', costPrice: 500, sellingPrice: 2000, stockQty: 999, barcode: 'VPN001', reorderLevel: 0 },
      { id: 'p7', brand: 'MPT', model: 'Data Top-up 5GB', specs: '30 Days', color: '', category: 'Bill / Topup', costPrice: 1000, sellingPrice: 2500, stockQty: 999, barcode: 'BILL001', reorderLevel: 0 }
    ],
    sales: [
      {
        id: 'sal1',
        invoiceNo: 'MS-INV-1001',
        user: 'Admin',
        customerName: 'Walk-in Customer',
        customerType: 'Retail',
        voucherType: 'Phone Sale Voucher',
        customerPhone: '',
        items: [{ productId: 'p1', name: 'Samsung Galaxy S24 (8GB/256GB)', qty: 1, price: 950000, cost: 850000, category: 'New Phone' }],
        total: 950000,
        discount: 5000,
        payable: 945000,
        payMethod: 'Cash',
        date: '2026-05-30T10:30:00.000Z'
      },
      {
        id: 'sal2',
        invoiceNo: 'MS-INV-1002',
        user: 'Cashier',
        customerName: 'Ko Aung',
        customerType: 'Retail',
        voucherType: 'Sale Voucher',
        customerPhone: '09987654321',
        items: [{ productId: 'p4', name: 'USB-C Cable 1m', qty: 2, price: 6000, cost: 3000, category: 'Accessories' }],
        total: 12000,
        discount: 0,
        payable: 12000,
        payMethod: 'KBZ Pay',
        date: '2026-05-31T09:15:00.000Z'
      }
    ],
    repairs: [
      { id: 'rep1', voucherNo: 'MS-REP-001', customerName: 'U Mya', phone: '09123456789', model: 'iPhone 14 Pro Max', issue: 'Screen cracked', status: 'In Progress', repairFee: 145000, staffId: 'Khun Lwin OO', created_at: '2026-05-29', completed_at: '' },
      { id: 'rep2', voucherNo: 'MS-REP-002', customerName: 'Ma Aye', phone: '09876543210', model: 'Samsung S23', issue: 'Battery replacement', status: 'Done', repairFee: 35000, staffId: 'Khun Mg Ponn', created_at: '2026-05-30', completed_at: '2026-05-31' }
    ],
    buyins: [
      { id: 'b1', model: 'iPhone 13', imei: '352654123456789', sellerName: 'Ko Aung', sellerPhone: '09111111111', buyPrice: 500000, condition: 'Grade A', repairCost: 25000, status: 'Ready', editState: 'Approved', statusLedger: [{ state: 'Draft', date: '2026-05-28', by: 'Admin' }, { state: 'Approved', date: '2026-05-28', by: 'Admin' }], buy_date: '2026-05-28' }
    ],
    expenses: [
      { id: 'ledg1', type: 'outcome', category: 'Other Outcome', description: 'Shop rent May', amount: 150000, date: '2026-05-01', user: 'Admin' },
      { id: 'ledg2', type: 'outcome', category: 'Other Outcome', description: 'Electricity bill', amount: 25000, date: '2026-05-15', user: 'Admin' },
      { id: 'ledg3', type: 'income', category: 'Service Income', description: 'Manual repair income', amount: 50000, date: '2026-05-30', user: 'Admin' }
    ],
    accounts: [
      { id: 'cash', name: 'ငွေသား', method: 'Cash', balance: 957000 },
      { id: 'kbz', name: 'KBZ Pay', method: 'KBZ Pay', balance: 12000 },
      { id: 'wave', name: 'Wave Pay', method: 'Wave Pay', balance: 0 },
      { id: 'bank', name: 'Bank Transfer', method: 'Bank Transfer', balance: 0 }
    ],
    settings: {
      shopName: 'Mahar Shwe POS',
      address: 'ဆီဆိုင်မြို့',
      phone: '09778394052',
      currency: 'MMK',
      businessSubtitle: 'Mobile Software & Hardware Expert',
      logoUrl: 'https://raw.githubusercontent.com/maharshwemobile-lgtm/maharshwe.onlinewebsite/refs/heads/main/public/vpn/logo.png',
      defaultPaymentMethod: 'Cash',
      lowStockAlertQty: 2,
      taxRate: 0,
      defaultCustomerType: 'Retail',
      googleSheetWebAppUrl: '',
      googleSheetToken: '',
      googleAutoSyncEnabled: false,
      externalApiToken: 'maharshwe123',
      lastBackupDownloadedDate: '',
      lastBackupDownloadedAt: '',
      defaultRepairMode: 'choice',
      categories: ['New Phone','Used Phone','Accessories','VPN Service','Bill / Topup'],
      repairServiceTypes: ['Software','Hardware','LCD','Battery','Charging','Unlock'],
      partnerShops: []
    },
    activityLogs: []
  };
}

module.exports = { makeDefaultDb };

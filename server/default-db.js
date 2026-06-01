const bcrypt = require('bcryptjs');

function makeDefaultDb({ shopId = 'main', adminPassword = process.env.ADMIN_PASSWORD || 'admin123' } = {}) {
  if (process.env.NODE_ENV === 'production' && (!process.env.ADMIN_PASSWORD && adminPassword === 'admin123')) {
    throw new Error('ADMIN_PASSWORD must be set before creating a production database');
  }
  const adminHash = bcrypt.hashSync(String(adminPassword), 12);
  return {
    tenant: { id: shopId, created_at: new Date().toISOString() },
    users: [{
      id: 'u_admin',
      username: 'admin',
      password_hash: adminHash,
      name: 'Admin',
      role: 'Admin',
      permissions: {
        sale:true, history:true, discount:true, editSale:true, deleteSale:true,
        inventory:true, accounting:true, settings:true, purchase:true, backup:true, users:true
      },
      active: 1,
      created_at: new Date().toISOString()
    }],
    products: [],
    sales: [],
    repairs: [],
    buyins: [],
    expenses: [],
    accounts: [
      { id:'cash', name:'Cash', method:'Cash', balance:0 },
      { id:'kbz', name:'KBZ Pay', method:'KBZ Pay', balance:0 },
      { id:'wave', name:'Wave Pay', method:'Wave Pay', balance:0 },
      { id:'bank', name:'Bank Transfer', method:'Bank Transfer', balance:0 }
    ],
    settings: {
      shopName:'Mahar Shwe POS', address:'', phone:'', currency:'MMK',
      businessSubtitle:'Mobile Software & Hardware Expert', logoUrl:'',
      defaultPaymentMethod:'Cash', lowStockAlertQty:2, defaultCustomerType:'Retail',
      customerTypes:['Walk-in Customer','Retail','Wholesale','Partner Shop'],
      voucherTypes:['Sale Voucher','Repair Voucher','Bill Voucher','Phone Sale Voucher'],
      paymentMethods:['Cash','KBZ Pay','Wave Pay','Bank Transfer'],
      googleSheetWebAppUrl:'', googleSheetToken:'', googleAutoSyncEnabled:false,
      externalApiToken:'', lastBackupDownloadedDate:'', lastBackupDownloadedAt:'',
      repairLookupApiUrl:'https://maharshwe.online/api/voucher/{id}',
      repairLookupFallbackEnabled:false, repairSheetUpdateWebAppUrl:'',
      repairSheetUpdateToken:'', repairSheetAutoUpdateEnabled:true,
      categories:['New Phone','Used Phone','Accessories','VPN Service','Bill / Topup'],
      repairServiceTypes:['Software','Hardware','LCD','Battery','Charging','Unlock'],
      repairStatuses:['ပြင်ရန်','ပြင်ပြီး','ယူပြီး','ပစ္စည်းမှာရန်'],
      partnerShops:[]
    },
    activityLogs:[]
  };
}

module.exports = { makeDefaultDb };

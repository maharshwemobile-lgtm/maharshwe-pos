const crypto = require('crypto');
const { prisma } = require('./prisma');
const { ensureRepairPlatformSchema } = require('./repair-platform-schema');

const sessions = new Map();
const MONEY_METHODS = new Set(['CASH', 'KPAY', 'WAVE_PAY', 'BANK', 'OTHER']);

function text(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}
function number(value) {
  const parsed = Number(String(value ?? '').replaceAll(',', '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}
function allowedChatIds() {
  return new Set(String(process.env.TELEGRAM_POS_ALLOWED_CHAT_IDS || '').split(',').map((item) => item.trim()).filter(Boolean));
}
function currentYangonDate() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Yangon', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function ygnBounds(date = currentYangonDate()) {
  const start = new Date(`${date}T00:00:00+06:30`);
  const next = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end: next };
}
function chatKey(update) {
  return String(update?.message?.chat?.id || update?.callback_query?.message?.chat?.id || '');
}
function userText(update) {
  return text(update?.message?.text || update?.callback_query?.data || '', 1000);
}
async function telegramSend(chatId, message, keyboard) {
  const token = process.env.TELEGRAM_POS_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_API_KEY;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      ...(keyboard ? { reply_markup: keyboard } : {}),
    }),
  }).catch((error) => console.warn('Telegram send failed:', error.message));
}
function mainKeyboard() {
  return {
    keyboard: [
      [{ text: '/repair' }, { text: '/money' }],
      [{ text: '/expense' }, { text: '/income' }],
      [{ text: '/dashboard' }],
    ],
    resize_keyboard: true,
  };
}
async function resolveActor(chatId) {
  const allowed = allowedChatIds();
  if (allowed.size && !allowed.has(String(chatId))) throw new Error('This Telegram chat is not allowed. Add it to TELEGRAM_POS_ALLOWED_CHAT_IDS.');

  let shop = null;
  if (process.env.TELEGRAM_POS_SHOP_ID) {
    shop = await prisma.shop.findFirst({ where: { id: process.env.TELEGRAM_POS_SHOP_ID, active: true } });
  }
  if (!shop && process.env.TELEGRAM_POS_SHOP_CODE) {
    const code = process.env.TELEGRAM_POS_SHOP_CODE.trim();
    shop = await prisma.shop.findFirst({ where: { active: true, OR: [{ code }, { slug: code }] } });
  }
  if (!shop) {
    const shops = await prisma.shop.findMany({ where: { active: true }, take: 2, orderBy: { createdAt: 'asc' } });
    if (shops.length === 1) shop = shops[0];
  }
  if (!shop) throw new Error('Telegram POS shop is not configured. Set TELEGRAM_POS_SHOP_CODE or TELEGRAM_POS_SHOP_ID.');

  let user = null;
  if (process.env.TELEGRAM_POS_USER_ID) {
    user = await prisma.user.findFirst({ where: { id: process.env.TELEGRAM_POS_USER_ID, shopId: shop.id, active: true } });
  }
  if (!user) {
    user = await prisma.user.findFirst({ where: { shopId: shop.id, role: { in: ['SHOP_ADMIN', 'SUPER_ADMIN'] }, active: true }, orderBy: { createdAt: 'asc' } });
  }
  if (!user) user = await prisma.user.findFirst({ where: { shopId: shop.id, active: true }, orderBy: { createdAt: 'asc' } });
  if (!user) throw new Error('Telegram POS user is not configured. Set TELEGRAM_POS_USER_ID.');
  return { shopId: shop.id, userId: user.id, shop, user };
}
async function nextRepairNumber(tx, shopId) {
  const rows = await tx.$queryRawUnsafe('SELECT COALESCE(MAX(CAST(SUBSTRING(repair_number FROM 3) AS INTEGER)),0)::int AS max FROM repairs WHERE shop_id=$1::uuid AND repair_number ~ $2', shopId, '^TG[0-9]+$');
  return `TG${String(Number(rows[0]?.max || 0) + 1).padStart(4, '0')}`;
}
async function saveRepair(actor, data) {
  await ensureRepairPlatformSchema();
  return prisma.$transaction(async (tx) => {
    const id = crypto.randomUUID();
    const repairNumber = await nextRepairNumber(tx, actor.shopId);
    await tx.$executeRawUnsafe(`INSERT INTO repairs (id,shop_id,repair_number,customer_name,customer_phone,device_model,problem,estimated_cost,final_cost,deposit,payment_status,status,received_at,notes,source_type,source_provider,priority,accessories,external_payload,created_at,updated_at)
      VALUES ($1::uuid,$2::uuid,$3,$4,NULL,$5,$6,$7,0,0,'PENDING'::"PaymentStatus",'RECEIVED'::"RepairStatus",NOW(),$8,'TELEGRAM','TELEGRAM_POS','NORMAL','[]'::jsonb,'{}'::jsonb,NOW(),NOW())`,
      id, actor.shopId, repairNumber, data.customerName, data.deviceModel, data.problem, number(data.estimatedCost), data.note || null);
    await tx.$executeRawUnsafe(`INSERT INTO repair_status_history (id,shop_id,repair_id,status,changed_by_id,note,created_at) VALUES ($1::uuid,$2::uuid,$3::uuid,'RECEIVED'::"RepairStatus",$4::uuid,$5,NOW())`, crypto.randomUUID(), actor.shopId, id, actor.userId, 'Created from Telegram');
    await tx.auditLog.create({ data: { shopId: actor.shopId, userId: actor.userId, action: 'TELEGRAM_REPAIR_CREATED', entityType: 'repair', entityId: id, details: { repairNumber } } }).catch(() => {});
    return { id, repairNumber };
  });
}
async function ensureMoneyServiceSchema(tx = prisma) {
  await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS money_service_transactions_v2 (
    id UUID PRIMARY KEY,shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,transaction_number TEXT NOT NULL,
    mode TEXT NOT NULL,payment_method_id UUID REFERENCES finance_payment_methods(id) ON DELETE SET NULL,
    cash_account_id UUID REFERENCES money_accounts(id) ON DELETE SET NULL,wallet_account_id UUID REFERENCES money_accounts(id) ON DELETE SET NULL,
    sender_name TEXT,sender_phone TEXT,receiver_name TEXT,receiver_phone TEXT,withdrawer_name TEXT,withdrawer_phone TEXT,
    amount NUMERIC(14,2) NOT NULL,fee_mode TEXT NOT NULL DEFAULT 'CUSTOM',fee_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
    fee_amount NUMERIC(14,2) NOT NULL DEFAULT 0,customer_pays NUMERIC(14,2) NOT NULL DEFAULT 0,customer_receives NUMERIC(14,2) NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'PAID',paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,due_amount NUMERIC(14,2) NOT NULL DEFAULT 0,due_date DATE,
    reference TEXT,note TEXT,created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}
async function getMoneyAccounts(actor) {
  const cash = await prisma.moneyAccount.findFirst({ where: { shopId: actor.shopId, active: true, type: 'CASH' }, orderBy: { createdAt: 'asc' } });
  const methodRows = await prisma.$queryRawUnsafe(`SELECT m.id,m.name,m.code,m.account_id AS "accountId",a.id AS "walletAccountId",a.name AS "walletName",a.balance
    FROM finance_payment_methods m JOIN money_accounts a ON a.id=m.account_id
    WHERE m.shop_id=$1::uuid AND m.active=TRUE AND m.supports_money_service=TRUE ORDER BY m.sort_order,LOWER(m.name) LIMIT 1`, actor.shopId);
  const method = methodRows[0];
  if (!cash) throw new Error('Cash account မရှိသေးပါ။ Finance > Money Account မှာ Cash account ထည့်ပါ။');
  if (!method) throw new Error('Money service wallet မရှိသေးပါ။ Finance > Payment Types မှာ KPay/Wave wallet ဖွင့်ပါ။');
  return { cash, method };
}
function moneyTxnNumber() {
  const day = currentYangonDate().replaceAll('-', '');
  return `TG-MS-${day}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}
async function saveMoney(actor, data) {
  const mode = /^cash\s*out$/i.test(data.serviceType) || /out|ထုတ်/i.test(data.serviceType) ? 'CASH_OUT' : 'TRANSFER';
  const amount = number(data.amount);
  const fee = number(data.fee);
  if (amount <= 0) throw new Error('Customer Amount must be greater than zero.');
  await ensureMoneyServiceSchema();
  const { cash, method } = await getMoneyAccounts(actor);
  return prisma.$transaction(async (tx) => {
    const cashCurrent = await tx.moneyAccount.findUnique({ where: { id: cash.id } });
    const walletCurrent = await tx.moneyAccount.findUnique({ where: { id: method.walletAccountId } });
    const customerPays = amount + fee;
    const cashChange = mode === 'TRANSFER' ? customerPays : -amount;
    const walletChange = mode === 'TRANSFER' ? -amount : customerPays;
    const cashAfter = number(cashCurrent.balance) + cashChange;
    const walletAfter = number(walletCurrent.balance) + walletChange;
    if (cashAfter < -0.005) throw new Error(`Insufficient ${cash.name} balance`);
    if (walletAfter < -0.005) throw new Error(`Insufficient ${method.walletName} balance`);
    await tx.moneyAccount.update({ where: { id: cash.id }, data: { balance: cashAfter } });
    await tx.moneyAccount.update({ where: { id: method.walletAccountId }, data: { balance: walletAfter } });
    const id = crypto.randomUUID();
    const txNo = moneyTxnNumber();
    await tx.$executeRawUnsafe(`INSERT INTO money_service_transactions_v2(id,shop_id,transaction_number,mode,payment_method_id,cash_account_id,wallet_account_id,sender_name,sender_phone,receiver_name,receiver_phone,withdrawer_name,withdrawer_phone,amount,fee_mode,fee_rate,fee_amount,customer_pays,customer_receives,payment_status,paid_amount,due_amount,due_date,reference,note,created_by_id,created_at,updated_at)
      VALUES($1::uuid,$2::uuid,$3,$4,$5::uuid,$6::uuid,$7::uuid,$8,$9,$10,$11,$12,$13,$14,'CUSTOM',0,$15,$16,$17,'PAID',$16,0,NULL,'TELEGRAM',$18,$19::uuid,NOW(),NOW())`,
      id, actor.shopId, txNo, mode, method.id, cash.id, method.walletAccountId,
      mode === 'TRANSFER' ? data.customerName : null, mode === 'TRANSFER' ? data.customerPhone : null,
      mode === 'TRANSFER' ? data.customerName : null, mode === 'TRANSFER' ? data.customerPhone : null,
      mode === 'CASH_OUT' ? data.customerName : null, mode === 'CASH_OUT' ? data.customerPhone : null,
      amount, fee, customerPays, amount, data.note || null, actor.userId);
    await tx.auditLog.create({ data: { shopId: actor.shopId, userId: actor.userId, action: 'TELEGRAM_MONEY_SERVICE_CREATED', entityType: 'money_service_transaction_v2', entityId: id, details: { txNo, mode, amount, fee } } }).catch(() => {});
    return { id, txNo, mode };
  });
}
async function ensureBusinessTables(tx = prisma) {
  await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS business_expenses (id UUID PRIMARY KEY,shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,expense_date DATE NOT NULL,category TEXT NOT NULL,amount NUMERIC(14,2) NOT NULL DEFAULT 0,method TEXT NOT NULL DEFAULT 'CASH',money_account_id UUID REFERENCES money_accounts(id) ON DELETE SET NULL,note TEXT,created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS business_other_income (id UUID PRIMARY KEY,shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,income_date DATE NOT NULL,source TEXT NOT NULL,amount NUMERIC(14,2) NOT NULL DEFAULT 0,method TEXT NOT NULL DEFAULT 'CASH',money_account_id UUID REFERENCES money_accounts(id) ON DELETE SET NULL,note TEXT,created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
}
function normalizeMethod(value) {
  const raw = text(value, 30).toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  if (raw.includes('KPAY') || raw.includes('KBZ')) return 'KPAY';
  if (raw.includes('BANK')) return 'OTHER';
  if (raw.includes('WAVE')) return 'WAVE_PAY';
  if (MONEY_METHODS.has(raw)) return raw;
  return 'CASH';
}
async function accountByMethod(tx, shopId, method) {
  const type = method === 'KPAY' ? 'KPAY' : method;
  return tx.moneyAccount.findFirst({ where: { shopId, active: true, type }, orderBy: { createdAt: 'asc' } });
}
async function adjustAccount(tx, actor, account, amount, direction, note) {
  if (!account) return;
  const before = number(account.balance);
  const after = before + direction * amount;
  if (after < -0.005) throw new Error(`Insufficient ${account.name} balance`);
  await tx.moneyAccount.update({ where: { id: account.id }, data: { balance: after } });
  await tx.moneyServiceTransaction.create({ data: { shopId: actor.shopId, accountId: account.id, type: 'ACCOUNT_ADJUSTMENT', feeMode: 'MANUAL', cashChange: account.type === 'CASH' ? direction * amount : 0, walletChange: account.type === 'CASH' ? 0 : direction * amount, beforeCashBalance: account.type === 'CASH' ? before : 0, afterCashBalance: account.type === 'CASH' ? after : 0, beforeWalletBalance: account.type === 'CASH' ? 0 : before, afterWalletBalance: account.type === 'CASH' ? 0 : after, userId: actor.userId, note } });
}
async function saveExpense(actor, data) {
  const method = normalizeMethod(data.paidFrom);
  const amount = number(data.amount);
  if (amount <= 0) throw new Error('Amount must be greater than zero.');
  await ensureBusinessTables();
  return prisma.$transaction(async (tx) => {
    const account = await accountByMethod(tx, actor.shopId, method);
    await adjustAccount(tx, actor, account, amount, -1, `[TG_EXPENSE:${data.category}] ${data.note || ''}`.trim());
    const id = crypto.randomUUID();
    await tx.$executeRawUnsafe(`INSERT INTO business_expenses (id,shop_id,expense_date,category,amount,method,money_account_id,note,created_by_id,created_at) VALUES ($1::uuid,$2::uuid,$3::date,$4,$5,$6,$7::uuid,$8,$9::uuid,NOW())`, id, actor.shopId, currentYangonDate(), data.category, amount, method, account?.id || null, data.note || null, actor.userId);
    return { id };
  });
}
async function saveIncome(actor, data) {
  const method = normalizeMethod(data.receivedTo);
  const amount = number(data.amount);
  if (amount <= 0) throw new Error('Amount must be greater than zero.');
  await ensureBusinessTables();
  return prisma.$transaction(async (tx) => {
    const account = await accountByMethod(tx, actor.shopId, method);
    await adjustAccount(tx, actor, account, amount, 1, `[TG_INCOME:${data.category}] ${data.note || ''}`.trim());
    const id = crypto.randomUUID();
    await tx.$executeRawUnsafe(`INSERT INTO business_other_income (id,shop_id,income_date,source,amount,method,money_account_id,note,created_by_id,created_at) VALUES ($1::uuid,$2::uuid,$3::date,$4,$5,$6,$7::uuid,$8,$9::uuid,NOW())`, id, actor.shopId, currentYangonDate(), data.category, amount, method, account?.id || null, data.note || null, actor.userId);
    return { id };
  });
}
async function dashboardText(actor) {
  const { start, end } = ygnBounds();
  await ensureBusinessTables();
  await ensureMoneyServiceSchema();
  const [sales, pendingRepairs, moneyRows, expenseRows, incomeRows, accounts] = await Promise.all([
    prisma.sale.aggregate({ where: { shopId: actor.shopId, status: { not: 'VOIDED' }, soldAt: { gte: start, lt: end } }, _sum: { total: true, profitTotal: true } }),
    prisma.repair.count({ where: { shopId: actor.shopId, status: { in: ['RECEIVED', 'CHECKING', 'IN_PROGRESS', 'WAITING_PART'] } } }),
    prisma.$queryRawUnsafe('SELECT COALESCE(SUM(fee_amount),0) AS profit FROM money_service_transactions_v2 WHERE shop_id=$1::uuid AND created_at>=$2 AND created_at<$3', actor.shopId, start, end),
    prisma.$queryRawUnsafe('SELECT COALESCE(SUM(amount),0) AS total FROM business_expenses WHERE shop_id=$1::uuid AND expense_date=$2::date', actor.shopId, currentYangonDate()),
    prisma.$queryRawUnsafe('SELECT COALESCE(SUM(amount),0) AS total FROM business_other_income WHERE shop_id=$1::uuid AND income_date=$2::date', actor.shopId, currentYangonDate()),
    prisma.moneyAccount.findMany({ where: { shopId: actor.shopId, active: true }, select: { type: true, balance: true } }),
  ]);
  const cash = accounts.filter((a) => a.type === 'CASH').reduce((s, a) => s + number(a.balance), 0);
  const kpay = accounts.filter((a) => a.type === 'KPAY').reduce((s, a) => s + number(a.balance), 0);
  return `<b>📊 Today Dashboard</b>\nDate: ${currentYangonDate()}\n\nToday Sales: ${number(sales._sum.total).toLocaleString()}\nToday Profit: ${number(sales._sum.profitTotal).toLocaleString()}\nRepair Pending: ${pendingRepairs}\nMoney Service Profit: ${number(moneyRows[0]?.profit).toLocaleString()}\nCash Balance: ${cash.toLocaleString()}\nKPay Balance: ${kpay.toLocaleString()}\nExpense Total: ${number(expenseRows[0]?.total).toLocaleString()}\nOther Income: ${number(incomeRows[0]?.total).toLocaleString()}`;
}
const flows = {
  repair: { fields: [['customerName', 'Customer Name?'], ['deviceModel', 'Device Model?'], ['problem', 'ပြဿနာ?'], ['estimatedCost', 'ခန့်မှန်းကျသင့်ငွေ?'], ['note', 'Note?']], save: saveRepair, done: (r) => `✅ Repair saved\nRepair No: ${r.repairNumber}` },
  money: { fields: [['serviceType', 'Service Type? Cash In / Cash Out'], ['customerPhone', 'Customer Phone No?'], ['customerName', 'Customer Name?'], ['amount', 'Customer Amount?'], ['fee', 'Fee?'], ['note', 'Note?']], save: saveMoney, done: (r) => `✅ Money Service saved\nNo: ${r.txNo}\nType: ${r.mode}` },
  expense: { fields: [['category', 'Expense Category?'], ['amount', 'Amount?'], ['paidFrom', 'Paid From? Cash / KPay / Bank'], ['note', 'Note?']], save: saveExpense, done: () => '✅ Expense saved' },
  income: { fields: [['category', 'Income Category?'], ['amount', 'Amount?'], ['receivedTo', 'Received To? Cash / KPay / Bank'], ['note', 'Note?']], save: saveIncome, done: () => '✅ Other income saved' },
};
async function startFlow(chatId, name) {
  const flow = flows[name];
  sessions.set(chatId, { flow: name, index: 0, data: {} });
  await telegramSend(chatId, flow.fields[0][1]);
}
async function handleFlow(chatId, incoming) {
  const session = sessions.get(chatId);
  if (!session) return false;
  const flow = flows[session.flow];
  const [field] = flow.fields[session.index];
  session.data[field] = incoming === '-' ? '' : incoming;
  session.index += 1;
  if (session.index < flow.fields.length) {
    sessions.set(chatId, session);
    await telegramSend(chatId, flow.fields[session.index][1]);
    return true;
  }
  sessions.delete(chatId);
  const actor = await resolveActor(chatId);
  const result = await flow.save(actor, session.data);
  await telegramSend(chatId, flow.done(result), mainKeyboard());
  return true;
}
async function handleTelegram(update) {
  const chatId = chatKey(update);
  const incoming = userText(update);
  if (!chatId || !incoming) return;
  if (incoming === '/cancel') { sessions.delete(chatId); await telegramSend(chatId, 'Cancelled.', mainKeyboard()); return; }
  if (sessions.has(chatId) && !incoming.startsWith('/')) { await handleFlow(chatId, incoming); return; }
  if (incoming === '/start' || incoming === '/menu') { await telegramSend(chatId, 'Mahar POS Telegram Bot\n\n/repair\n/money\n/expense\n/income\n/dashboard', mainKeyboard()); return; }
  if (incoming === '/repair') return startFlow(chatId, 'repair');
  if (incoming === '/money') return startFlow(chatId, 'money');
  if (incoming === '/expense') return startFlow(chatId, 'expense');
  if (incoming === '/income') return startFlow(chatId, 'income');
  if (incoming === '/dashboard') { const actor = await resolveActor(chatId); await telegramSend(chatId, await dashboardText(actor), mainKeyboard()); return; }
  await telegramSend(chatId, 'Command မသိပါ။ /menu ကိုနှိပ်ပါ။', mainKeyboard());
}
function attachTelegramPosBotApi(app) {
  app.get('/api/telegram-pos/health', (_req, res) => res.json({ ok: true, bot: 'telegram-pos' }));
  app.post('/api/telegram-pos/webhook/:secret?', async (req, res) => {
    try {
      const expected = process.env.TELEGRAM_POS_WEBHOOK_SECRET || '';
      if (expected && req.params.secret !== expected) return res.status(403).json({ ok: false, message: 'Invalid Telegram webhook secret' });
      await handleTelegram(req.body || {});
      return res.json({ ok: true });
    } catch (error) {
      const chatId = chatKey(req.body || {});
      if (chatId) await telegramSend(chatId, `❌ ${error.message || 'Telegram POS error'}`, mainKeyboard());
      return res.json({ ok: true, error: error.message || 'Telegram POS error' });
    }
  });
}
module.exports = attachTelegramPosBotApi;

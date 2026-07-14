/* ===== Page configs for every sidebar route — extracted from the live stockm.shop UI =====
   btn kinds: new | export | import | template | search | custom(label)
   filter kinds: search(placeholder) | select(label) | date | range(နေ့စဉ်)
*/
const PAGES = {
  '/main/users': {
    title: 'အသုံးပြုသူ', btns: ['new', 'template'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }],
    cols: ['စဉ်', 'အမည်', 'အီးမေးလ်', 'ဖုန်းနံပါတ်', 'အခန်းကဏ္ဍ', 'လုပ်ဆောင်ချက်'],
  },
  '/main/customers': {
    title: 'ဖောက်သည်', btns: ['new', 'export', 'import', 'template'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }],
    cols: ['စဉ်', 'အမည်', 'လိပ်စာ', 'ဖုန်းနံပါတ်', 'လုပ်ဆောင်ချက်'],
  },
  '/main/suppliers': {
    title: 'ပစ္စည်းသွင်းသူ', btns: ['new', 'export', 'template'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }],
    cols: ['စဉ်', 'အမည်', 'လိပ်စာ', 'ဖုန်းနံပါတ်', 'လုပ်ဆောင်ချက်'],
  },
  '/main/inventories': {
    title: 'လုပ်ငန်းနေရာ', btns: ['new', 'template'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }],
    cols: ['စဉ်', 'အမည်', 'လိပ်စာ', 'ဖုန်းနံပါတ်', 'လုပ်ဆောင်ချက်'],
  },
  '/main/accounts': {
    title: 'ငွေအကောင့်', btns: ['new', 'template'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }],
    cols: ['စဉ်', 'ငွေအကောင့်အမည်', 'ငွေအကောင့်လက်ကျန်', 'လုပ်ဆောင်ချက်'],
  },
  '/main/income-categories': {
    title: 'ဝင်ငွေအမျိုးအစား', btns: ['new', 'export', 'template'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }],
    cols: ['စဉ်', 'အမည်', 'ရက်စွဲ', 'လုပ်ဆောင်ချက်'],
  },
  '/main/incomes': {
    title: 'ဝင်ငွေ', btns: ['new', 'export', 'template'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }],
    cols: ['စဉ်', 'အမျိုးအစားအမည်', 'ပမာဏ', 'ငွေအကောင့်အမည်', 'ရက်စွဲ', 'လုပ်ဆောင်ချက်'],
  },
  '/main/main-categories': {
    title: 'အဓိကအမျိုးအစား', btns: ['new', 'export', 'import', 'template'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }],
    cols: ['စဉ်', 'အမည်', 'ရက်စွဲ', 'လုပ်ဆောင်ချက်'],
  },
  '/main/sub-categories': {
    title: 'အမျိုးအစားခွဲ', btns: ['new', 'export', 'import', 'template'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }],
    cols: ['စဉ်', 'အမျိုးအစားအစု အမည်', 'အမည်', 'ကုဒ်', 'ရက်စွဲ', 'လုပ်ဆောင်ချက်'],
  },
  '/main/units': {
    title: 'ယူနစ်', btns: ['new', 'export', 'import', 'template'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }],
    cols: ['စဉ်', 'အမည်', 'ရက်စွဲ', 'လုပ်ဆောင်ချက်'],
  },
  '/main/purchase-orders': {
    title: 'ဝယ်ယူမှုအော်ဒါ', btns: ['new', 'template'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }],
    cols: ['စဉ်', 'ID', 'ပစ္စည်းသွင်းသူအမည်', 'လုပ်ငန်းနေရာအမည်', 'စုစုပေါင်းပမာဏ', 'အခြေအနေ', 'ရက်စွဲ', 'အော်ဒါ ပြုလုပ်သူ', 'လုပ်ဆောင်ချက်'],
  },
  '/main/purchase-edits': {
    title: 'ဝယ်ယူမှု ပြင်ဆင်ခြင်း', btns: ['template', 'search'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'ပစ္စည်းသွင်းသူရွေးပါ' }, { t: 'select', l: 'လုပ်ငန်းနေရာရွေးပါ' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }],
    cols: ['စဉ်', 'ဝယ်ယူမှု ID', 'ပစ္စည်းသွင်းသူအမည်', 'လုပ်ငန်းနေရာအမည်', 'စုစုပေါင်းပမာဏ', 'အကြွေးပမာဏ', 'ရက်စွဲ', 'လုပ်ဆောင်ချက်'],
  },
  '/main/purchase-returns': {
    title: 'ဝယ်ယူမှု ပြန်လည်ပေးအပ်ခြင်း', btns: ['template', 'search'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'ပစ္စည်းသွင်းသူရွေးပါ' }, { t: 'select', l: 'လုပ်ငန်းနေရာရွေးပါ' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }],
    cols: ['စဉ်', 'ဝယ်ယူမှု ID', 'ပစ္စည်းသွင်းသူအမည်', 'လုပ်ငန်းနေရာအမည်', 'စုစုပေါင်းပမာဏ', 'အကြွေးပမာဏ', 'ရက်စွဲ', 'လုပ်ဆောင်ချက်'],
  },
  '/main/set-pricings': {
    title: 'ရောင်းစျေးနှင့် လျှော့စျေး',
    btns: [{ label: 'ဈေးသတ်မှတ်မည်', badge: 0 }, { label: 'လျှော့စျေးသတ်မှတ်မည်', badge: 0 }, { label: 'ဘားကုဒ်ပရင့်', badge: 0 }, { label: 'ဒေတာထုတ်မည်', badge: 0 }, 'template'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'အမျိုးအစား ရွေးပါ' }],
    cols: ['✓', 'စဉ်', 'အမည်', 'ဘားကုဒ်', 'အမျိုးအစားခွဲ', 'ဝယ်ဈေး', 'လက်လီဈေး', 'လက္ကားဈေး', 'လျှော့စျေး', 'လုပ်ဆောင်ချက်'],
  },
  '/main/sale-edits': {
    title: 'ရောင်းချမှု ပြင်ဆင်ခြင်း', btns: ['template', 'search'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'search', p: 'ဖောက်သည် ရှာဖွေပါ...' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }],
    cols: ['စဉ်', 'ရောင်းချမှု ID', 'ဖောက်သည်အမည်', 'စုစုပေါင်းပမာဏ', 'အကြွေးပမာဏ', 'ရက်စွဲ', 'ရောင်းသူ', 'လုပ်ဆောင်ချက်'],
  },
  '/main/sale-returns': {
    title: 'ရောင်းချမှု ပြန်လည်ပေးအပ်ခြင်း', btns: ['template', 'search'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'search', p: 'ဖောက်သည် ရှာဖွေပါ...' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }],
    cols: ['စဉ်', 'ရောင်းချမှု ID', 'ဖောက်သည်အမည်', 'စုစုပေါင်းပမာဏ', 'အကြွေးပမာဏ', 'ရက်စွဲ', 'ရောင်းသူ', 'လုပ်ဆောင်ချက်'],
  },
  '/main/account-transfers': {
    title: 'ငွေလွှဲပြောင်းမှု', btns: ['new', 'template'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }],
    cols: ['စဉ်', 'ငွေပေးပို့မည့်အကောင့်', 'ငွေလက်ခံမည့်အကောင့်', 'ပမာဏ', 'မှတ်ချက်', 'ရက်စွဲ', 'လွှဲပြောင်းသူ', 'လုပ်ဆောင်ချက်'],
  },
  '/main/item-transfers': {
    title: 'ပစ္စည်းလွှဲပြောင်းမှု', btns: ['new', 'template'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }],
    cols: ['စဉ်', 'ပို့မည့် လုပ်ငန်းနေရာ', 'လက်ခံမည့် လုပ်ငန်းနေရာ', 'အခြေအနေ', 'လွှဲပြောင်းသူ', 'ရက်စွဲ', 'လုပ်ဆောင်ချက်'],
  },
  '/main/account-adjustments': {
    title: 'ငွေအကောင့်', btns: [],
    filters: [{ t: 'search', p: 'Search...' }],
    cols: ['စဉ်', 'ငွေအကောင့်အမည်', 'ငွေအကောင့်လက်ကျန်', 'လုပ်ဆောင်ချက်'],
  },
  '/main/item-adjustments': {
    title: 'ပစ္စည်းစာရင်းညှိ', btns: ['template', 'search'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'လုပ်ငန်းနေရာရွေးပါ' }, { t: 'select', l: 'အမျိုးအစား ရွေးပါ' }],
    cols: ['စဉ်', 'လုပ်ငန်းနေရာအမည်', 'ပစ္စည်းအမည်', 'အရေ အတွက်', 'ယူနစ်', 'လုပ်ဆောင်ချက်'],
  },
  '/main/currencies': {
    title: 'ငွေကြေး', btns: ['new', 'template'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }],
    cols: ['စဉ်', 'နိုင်ငံအမည်', 'သင်္ကေတ', 'လဲလှယ်နှုန်း', 'လုပ်ဆောင်ချက်'],
  },
  '/main/expense-categories': {
    title: 'အသုံးစရိတ် အဓိကအမျိုးအစား', btns: ['new', 'export', 'template'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }],
    cols: ['စဉ်', 'အမည်', 'ရက်စွဲ', 'လုပ်ဆောင်ချက်'],
  },
  '/main/expense-sub-categories': {
    title: 'အသုံးစရိတ် အမျိုးအစားခွဲ', btns: ['new', 'export', 'template'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }],
    cols: ['စဉ်', 'အမျိုးအစားအမည်', 'အမည်', 'ရက်စွဲ', 'လုပ်ဆောင်ချက်'],
  },
  '/main/expenses': {
    title: 'အသုံးစရိတ်', btns: ['new', 'export', 'template'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }],
    cols: ['စဉ်', 'အမျိုးအစားအမည်', 'ပမာဏ', 'ငွေပေးချေမည့်အကောင့်', 'ရက်စွဲ', 'လုပ်ဆောင်ချက်'],
  },
  '/main/supplier-payments': {
    title: 'ပစ္စည်းသွင်းသူ ပေးချေမူ', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }],
    cols: ['စဉ်', 'အမည်', 'လိပ်စာ', 'ဖုန်းနံပါတ်', 'အကြွေးပမာဏ', 'လုပ်ဆောင်ချက်'],
    payAction: true,
  },
  '/main/customer-payments': {
    title: 'ဖောက်သည် ပေးချေမူ', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }],
    cols: ['စဉ်', 'အမည်', 'လိပ်စာ', 'ဖုန်းနံပါတ်', 'အကြွေးပမာဏ', 'လုပ်ဆောင်ချက်'],
    payAction: true,
  },
  /* ---------- reports ---------- */
  '/report/purchases': {
    title: 'ဝယ်ယူမှု အစီရင်ခံစာ', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'ပစ္စည်းသွင်းသူရွေးပါ' }, { t: 'select', l: 'လုပ်ငန်းနေရာရွေးပါ' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'ဝယ်ယူမှု ID', 'ပစ္စည်းသွင်းသူအမည်', 'လုပ်ငန်းနေရာအမည်', 'အခြားကုန်ကျစရိတ်', 'စုစုပေါင်းပမာဏ', 'လျော့‌ငွေ', 'အကြွေးပမာဏ', 'ရက်စွဲ', 'လုပ်ဆောင်ချက်'],
  },
  '/report/purchase-payments': {
    title: 'ဝယ်ယူမှု ငွေပေးချေမှု', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'ပစ္စည်းသွင်းသူရွေးပါ' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'ပစ္စည်းသွင်းသူအမည်', 'ငွေအကောင့်အမည်', 'ပမာဏ', 'ရက်စွဲ', 'ပေးချေသူ', 'လုပ်ဆောင်ချက်'],
  },
  '/report/purchase-returns': {
    title: 'ဝယ်ယူမှု ပြန်လည်ပေးအပ်ခြင်း', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'ပစ္စည်းသွင်းသူရွေးပါ' }, { t: 'select', l: 'လုပ်ငန်းနေရာရွေးပါ' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'ဝယ်ယူမှု ID', 'ပစ္စည်းသွင်းသူအမည်', 'ငွေအကောင့်အမည်', 'ပြန်သွင်းငွေ', 'ပြန်သွင်းသည့်ရက်', 'ပြန်အပ်သူ', 'လုပ်ဆောင်ချက်'],
  },
  '/report/purchase-return-payments': {
    title: 'ပြန်အမ်းငွေ ပေးချေမှု', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'ပစ္စည်းသွင်းသူရွေးပါ' }, { t: 'select', l: 'လုပ်ငန်းနေရာရွေးပါ' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'ဝယ်ယူမှု ID', 'ပစ္စည်းသွင်းသူအမည်', 'ငွေအကောင့်အမည်', 'ပြန်သွင်းငွေ', 'ပြန်သွင်းသည့်ရက်', 'လက်ခံသူ', 'လုပ်ဆောင်ချက်'],
  },
  '/report/sales': {
    title: 'ရောင်းချမှု အစီရင်ခံစာ', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'search', p: 'ဖောက်သည် ရှာဖွေပါ...' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'ရောင်းချမှု ID', 'ဖောက်သည်အမည်', 'စုစုပေါင်းပမာဏ', 'အကြွေးပမာဏ', 'ရက်စွဲ', 'ရောင်းသူ', 'လုပ်ဆောင်ချက်'],
  },
  '/report/sale-payments': {
    title: 'ရောင်းချငွေပေးချေမှု', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'search', p: 'ဖောက်သည် ရှာဖွေပါ...' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'select', l: 'ငွေပေးချေမှု အခြေအနေ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'Sale ID', 'ဖောက်သည်အမည်', 'ငွေအကောင့်အမည်', 'ပမာဏ', 'ငွေပေးချေမှုရက်စွဲ', 'ရောင်းသူ', 'လက်ခံသူ', 'လုပ်ဆောင်ချက်'],
  },
  '/report/sale-returns': {
    title: 'ရောင်းချမှု ပြန်လည်ပေးအပ်ခြင်း', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'search', p: 'ဖောက်သည် ရှာဖွေပါ...' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'ရောင်းချမှု ID', 'ဖောက်သည်အမည်', 'ငွေအကောင့်အမည်', 'ပြန်သွင်းငွေ', 'ပြန်သွင်းသည့်ရက်', 'ပြန်အပ်သူ', 'လုပ်ဆောင်ချက်'],
  },
  '/report/sale-return-payments': {
    title: 'ပြန်အမ်းငွေ ပေးချေမှု', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'search', p: 'ဖောက်သည် ရှာဖွေပါ...' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'ရောင်းချမှု ID', 'ဖောက်သည်အမည်', 'ငွေအကောင့်အမည်', 'ပမာဏ', 'ရက်စွဲ', 'ပေးချေသူ', 'လုပ်ဆောင်ချက်'],
  },
  '/report/item-transactions': {
    title: 'ပစ္စည်း အဝင်အထွက်', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'လုပ်ငန်းနေရာရွေးပါ' }, { t: 'select', l: 'အမျိုးအစား ရွေးပါ' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'လုပ်ငန်းနေရာအမည်', 'ပစ္စည်းအမည်', 'အဖွင့်', 'အရေ အတွက်', 'ယူနစ်', 'အမျိုးအစား', 'အပိတ်', 'ရက်စွဲ', 'ထည့်သွင်းသူ'],
  },
  '/report/account-transactions': {
    title: 'ငွေအကောင့် အဝင်အထွက်', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'ငွေအကောင့်ကို ရွေးပါ' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'ငွေအကောင့်အမည်', 'အဖွင့်', 'ပမာဏ', 'အမျိုးအစား', 'အပိတ်', 'ရက်စွဲ', 'ထည့်သွင်းသူ'],
  },
  '/report/advanced-item-transactions': {
    title: 'အသေးစိတ် ပစ္စည်း အဝင်အထွက်', btns: [],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'လုပ်ငန်းနေရာရွေးပါ' }, { t: 'select', l: 'အမျိုးအစား ရွေးပါ' }, { t: 'select', l: 'ရွေးပါ' }],
    cols: ['စဉ်', 'ရက်စွဲ', 'လုပ်ငန်းနေရာ', 'ပစ္စည်းအမည်', 'မှတ်ချက်', 'အမျိုးအစား', 'အဖွင့်', 'ပစ္စည်း အဝင်', 'ပစ္စည်း အထွက်', 'အပိတ်', 'ယူနစ်'],
    noPag: true,
  },
  '/report/account-adjustment-reports': {
    title: 'ငွေစာရင်းညှိ', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'အမျိုးအစား ရွေးပါ' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'ငွေအကောင့်အမည်', 'ပမာဏ', 'အမျိုးအစား', 'ရက်စွဲ', 'ထည့်သွင်းသူ'],
  },
  '/report/stock-adjustment-reports': {
    title: 'ပစ္စည်းစာရင်းညှိ', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'အမျိုးအစား ရွေးပါ' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'လုပ်ငန်းနေရာအမည်', 'ပစ္စည်းအမည်', 'အရေ အတွက်', 'အမျိုးအစား', 'ယူနစ်', 'မှတ်ချက်', 'ရက်စွဲ', 'ပြင်ဆင်သူ'],
  },
  '/report/item-transfers': {
    title: 'ပစ္စည်းလွှဲပြောင်းမှု', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'ပစ္စည်းပို့မည့် လုပ်ငန်းနေရာကို ရွေးပါ' }, { t: 'select', l: 'ပစ္စည်းလက်ခံမည့် လုပ်ငန်းနေရာကို ရွေးပါ' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'လွှဲပြောင်းမှု ID', 'ပို့မည့် လုပ်ငန်းနေရာ', 'လက်ခံမည့် လုပ်ငန်းနေရာ', 'မှတ်ချက်', 'လွှဲပြောင်းသူ', 'အခြေအနေ', 'ရက်စွဲ', 'လုပ်ဆောင်ချက်'],
  },
  '/report/account-transfers': {
    title: 'ငွေလွှဲပြောင်းမှု', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'ငွေပေးပို့မည့်အကောင့်ကို ရွေးပါ' }, { t: 'select', l: 'ငွေလက်ခံမည့်အကောင့်ကို ရွေးပါ' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'လွှဲပြောင်းမှု ID', 'ငွေပေးပို့မည့်အကောင့်', 'ငွေလက်ခံမည့်အကောင့်', 'ပမာဏ', 'မှတ်ချက်', 'ရက်စွဲ', 'လွှဲပြောင်းသူ'],
  },
  '/report/item-ledger-reports': {
    title: 'ပစ္စည်း လည်ချာ', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'ပစ္စည်းအမည်', 'အဖွင့်', 'ရောင်းချမှု', 'ပြန်အပ်ခြင်း', 'ဝယ်ယူမှု', 'ပြန်အပ်ခြင်း', 'စာရင်းညှိ', 'အပိတ်', 'လက်ရှိ', 'ယူနစ်'],
  },
  '/report/account-ledger-reports': {
    title: 'ငွေအကောင့် လည်ချာ', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'ငွေအကောင့်အမည်', 'ရောင်းချမှု', 'အရောင်း အကြွေး', 'ရောင်းချမှု ပြန်လည်ပေးအပ်ခြင်း', 'ဝယ်ယူမှု', 'အဝယ် အကြွေး', 'ဝယ်ယူမှု ပြန်လည်ပေးအပ်ခြင်း', 'လက်ရှိ'],
  },
  '/report/sale-ledger-reports': {
    title: 'အရောင်း လည်ချာ', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['ရက်စွဲ', 'ထည့်သွင်းသူ', 'ပစ္စည်းအမည်', 'အမျိုးအစားအမည်', 'အမျိုးအစားစုခွဲ အမည်', 'ယူနစ်အမည်', 'ရောင်းချမှု ID', 'ဖောက်သည်အမည်', 'လုပ်ငန်းနေရာအမည်', 'အရေ အတွက်', 'ရောင်းဈေး', 'စုစုပေါင်းဈေးနှုန်း'],
  },
  '/report/sale-return-ledger-reports': {
    title: 'အရောင်းပြန်အပ် လည်ချာ', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['ရက်စွဲ', 'ထည့်သွင်းသူ', 'ပစ္စည်းအမည်', 'အမျိုးအစားအမည်', 'အမျိုးအစားစုခွဲ အမည်', 'ယူနစ်အမည်', 'ရောင်းချမှု ID', 'Sale Return ID', 'ဖောက်သည်အမည်', 'လုပ်ငန်းနေရာအမည်', 'အရေ အတွက်', 'ဈေးနှုန်း', 'စုစုပေါင်းဈေးနှုန်း'],
  },
  '/report/purchase-ledger-reports': {
    title: 'အဝယ် လည်ချာ', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['ရက်စွဲ', 'ထည့်သွင်းသူ', 'ပစ္စည်းအမည်', 'အမျိုးအစားအမည်', 'အမျိုးအစားစုခွဲ အမည်', 'ယူနစ်အမည်', 'ဝယ်ယူမှု ID', 'ပစ္စည်းသွင်းသူအမည်', 'လုပ်ငန်းနေရာအမည်', 'အရေ အတွက်', 'ဝယ်ဈေး', 'စုစုပေါင်းဈေးနှုန်း'],
  },
  '/report/purchase-return-ledger-reports': {
    title: 'အဝယ်ပြန်အပ် လည်ချာ', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['ရက်စွဲ', 'ထည့်သွင်းသူ', 'ပစ္စည်းအမည်', 'အမျိုးအစားအမည်', 'အမျိုးအစားစုခွဲ အမည်', 'ယူနစ်အမည်', 'ဝယ်ယူမှု ID', 'Purchase Return ID', 'ပစ္စည်းသွင်းသူအမည်', 'လုပ်ငန်းနေရာအမည်', 'အရေ အတွက်', 'ဝယ်ဈေး', 'စုစုပေါင်းဈေးနှုန်း'],
  },
  '/report/purchase-order-ledger-reports': {
    title: 'အဝယ်အော်ဒါ လည်ချာ', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['ရက်စွဲ', 'ထည့်သွင်းသူ', 'ပစ္စည်းအမည်', 'အမျိုးအစားအမည်', 'အမျိုးအစားစုခွဲ အမည်', 'ယူနစ်အမည်', 'အဝယ်အော်ဒါ ID', 'အခြေအနေ', 'ပစ္စည်းသွင်းသူအမည်', 'လုပ်ငန်းနေရာအမည်', 'အရေ အတွက်', 'ဝယ်ဈေး', 'စုစုပေါင်းဈေးနှုန်း'],
  },
  '/report/sale-summary': {
    title: 'ရောင်းချမှု အနှစ်ချုပ်', btns: [],
    filters: [{ t: 'select', l: 'အသုံးပြုသူရွေးပါ' }],
    cols: ['စဉ်', 'ရက်စွဲ', 'စုစုပေါင်းကျသင့်ငွေ', 'အကြွေးပမာဏ', 'လျှော့စျေး', 'ပို့ခ'],
    noPag: true,
  },
  '/report/item-summary': {
    title: 'ပစ္စည်း အနှစ်ချုပ်', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'ပစ္စည်းအမည်', 'ရောင်းချမှု', 'ယူနစ်', 'စုစုပေါင်းဝယ်ဈေး', 'စုစုပေါင်းရောင်းဈေး', 'စုစုပေါင်း အမြတ်'],
  },
  '/report/customer-summary': {
    title: 'ဖောက်သည် အနှစ်ချုပ်', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'ဖောက်သည်အမည်', 'စုစုပေါင်းကျသင့်ငွေ', 'အကြွေးပမာဏ', 'ပေးငွေပမာဏ', 'ပို့ခ', 'လျှော့စျေး'],
  },
  '/report/category-summary': {
    title: 'ပစ္စည်းအမျိုးအစား အနှစ်ချုပ်', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'အမည်', 'စုစုပေါင်းဝယ်ဈေး', 'စုစုပေါင်းရောင်းဈေး', 'စုစုပေါင်း အမြတ်'],
  },
  '/report/stock-reports': {
    title: 'ပစ္စည်းစာရင်း အစီရင်ခံစာ', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'အားလုံး' }, { t: 'select', l: 'လုပ်ငန်းနေရာရွေးပါ' }],
    cols: ['စဉ်', 'လုပ်ငန်းနေရာအမည်', 'ပစ္စည်းအမည်', 'အမျိုးအစားစုခွဲ အမည်', 'အရေ အတွက်', 'ယူနစ်', 'လက်လီဈေး', 'လက္ကားဈေး'],
  },
  '/report/sale-profit-reports': {
    title: 'ရောင်းချမှု အမြတ်', btns: ['export', 'template'],
    filters: [{ t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'ရောင်းချမှု ID', 'ဖောက်သည်အမည်', 'စုစုပေါင်းကျသင့်ငွေ', 'လျော့‌ငွေ', 'စုစုပေါင်း အမြတ်', 'ရက်စွဲ', 'ရောင်းသူ'],
  },
  '/report/expense-reports': {
    title: 'အသုံးစရိတ် အစီရင်ခံစာ', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'အသုံးစရိတ် အမျိုးအစားခွဲ ကိုရွေးပါ' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'အသုံးစရိတ် ID', 'အမျိုးအစားအမည်', 'ပမာဏ', 'ငွေအကောင့်အမည်', 'ရက်စွဲ', 'ထည့်သွင်းသူ'],
  },
  '/report/income-reports': {
    title: 'ဝင်ငွေ အစီရင်ခံစာ', btns: ['export'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }, { t: 'select', l: 'ဝင်ငွေအမျိုးအစား ရွေးပါ' }, { t: 'select', l: 'အသုံးပြုသူရွေးပါ' }, { t: 'range' }, { t: 'date' }],
    cols: ['စဉ်', 'ဝင်ငွေ ID', 'အမျိုးအစားအမည်', 'ငွေအကောင့်အမည်', 'ပမာဏ', 'ရက်စွဲ', 'ထည့်သွင်းသူ'],
  },
  '/setting/purchase': {
    title: 'ထပ်တိုးကုန်ကျစရိတ်', btns: ['new', 'template'],
    filters: [{ t: 'search', p: 'ရှာဖွေပါ...' }],
    cols: ['စဉ်', 'အမည်', 'ရက်စွဲ', 'လုပ်ဆောင်ချက်'],
  },
};

/* ===== create/edit dialog configs =====
   field kinds: text | number | select | date | textarea | password
   map: column header used to prefill the field when editing a row */
/* Field structures below were captured from the live site's dialogs after login.
   All dialogs share header "ဒေတာထည့်ပါ" and buttons ပိတ်ပါ/မလုပ်တော့ပါ + သိမ်းဆည်းပါ. */
const DIALOGS = {
  '/main/users': { title: 'အသုံးပြုသူ', fields: [
    { l: 'အမည်', t: 'text', req: 1, p: 'အမည်', map: 'အမည်' },
    { l: 'အီးမေးလ်', t: 'text', req: 1, p: 'အီးမေးလ်', map: 'အီးမေးလ်' },
    { l: 'စကားဝှက်', t: 'password', req: 1, p: 'စကားဝှက်' },
    { l: 'ဖုန်းနံပါတ်', t: 'text', req: 1, p: 'ဖုန်းနံပါတ်', map: 'ဖုန်းနံပါတ်' },
    { l: 'အခန်းကဏ္ဍ', t: 'select', req: 1, opts: ['Admin', 'Sale'], map: 'အခန်းကဏ္ဍ' },
    { l: 'လုပ်ငန်းနေရာ', t: 'select', req: 1, opts: ['ဆိုင် 1'] },
  ]},
  '/main/customers': { title: 'ဖောက်သည်', fields: [
    { l: 'အမည်', t: 'text', req: 1, p: 'အမည်', map: 'အမည်' },
    { l: 'ဖုန်းနံပါတ်', t: 'text', p: 'ဖုန်းနံပါတ်', map: 'ဖုန်းနံပါတ်' },
    { l: 'လိပ်စာ', t: 'text', p: 'လိပ်စာ', map: 'လိပ်စာ' },
    { l: 'အကြွေး', t: 'select', req: 1, opts: ['ရနိုင်သည်', 'မရနိုင်ပါ'] },
  ]},
  '/main/suppliers': { title: 'ပစ္စည်းသွင်းသူ', fields: [
    { l: 'အမည်', t: 'text', req: 1, p: 'အမည်', map: 'အမည်' },
    { l: 'လိပ်စာ', t: 'text', p: 'လိပ်စာ', map: 'လိပ်စာ' },
    { l: 'ဖုန်းနံပါတ်', t: 'text', p: 'ဖုန်းနံပါတ်', map: 'ဖုန်းနံပါတ်' },
  ]},
  '/main/inventories': { title: 'လုပ်ငန်းနေရာ', fields: [
    { l: 'အမည်', t: 'text', req: 1, p: 'အမည်', map: 'အမည်' },
    { l: 'လိပ်စာ', t: 'text', p: 'လိပ်စာ', map: 'လိပ်စာ' },
    { l: 'ဖုန်းနံပါတ်', t: 'text', p: 'ဖုန်းနံပါတ်', map: 'ဖုန်းနံပါတ်' },
  ]},
  '/main/accounts': { title: 'ငွေအကောင့်', fields: [
    { l: 'ငွေအကောင့်အမည်', t: 'text', req: 1, p: 'Eg. Cash, Kpay, Wave .....', map: 'ငွေအကောင့်အမည်' },
  ]},
  '/main/income-categories': { title: 'ဝင်ငွေအမျိုးအစား', fields: [
    { l: 'အမည်', t: 'text', req: 1, p: 'ဝင်ငွေအမျိုးအစားအမည်', map: 'အမည်' },
  ]},
  '/main/incomes': { title: 'ဝင်ငွေ', fields: [
    { l: 'ဝင်ငွေအမျိုးအစား', t: 'select', req: 1, opts: ['အခြားဝင်ငွေ', 'ပြုပြင်ခ'], map: 'အမျိုးအစားအမည်' },
    { l: 'ငွေအကောင့်', t: 'select', req: 1, opts: () => SAMPLE.accounts, map: 'ငွေအကောင့်အမည်' },
    { l: 'ပမာဏ', t: 'number', req: 1, p: 'ပမာဏ', map: 'ပမာဏ' },
    { l: 'ဖော်ပြချက်', t: 'textarea' },
  ]},
  '/main/main-categories': { title: 'အဓိကအမျိုးအစား', fields: [
    { l: 'အမည်', t: 'text', req: 1, p: 'အမျိုးအစားအမည်', map: 'အမည်' },
  ]},
  '/main/sub-categories': { title: 'အမျိုးအစားခွဲ', fields: [
    { l: 'အဓိကအမျိုးအစား', t: 'select', req: 1, opts: ['Phone', 'Accessory'], map: 'အမျိုးအစားအစု အမည်' },
    { l: 'အမည်', t: 'text', req: 1, p: 'အမျိုးအစားစုခွဲ အမည်', map: 'အမည်' },
    { l: 'ကုဒ်', t: 'text', req: 1, p: 'eg. ELC, DD-, ITEM, ....', map: 'ကုဒ်' },
  ]},
  '/main/units': { title: 'ယူနစ်', fields: [
    { l: 'အမည်', t: 'text', req: 1, p: 'အမည်', map: 'အမည်' },
  ]},
  '/main/items': { title: 'ပစ္စည်း', fields: [
    { l: 'အမည်', t: 'text', req: 1, p: 'ပစ္စည်းအမည်', map: 'အမည်', k: 'name' },
    { l: 'ဘားကုဒ်', t: 'text', p: 'ပစ္စည်းဘားကုဒ်', map: 'ဘားကုဒ်', k: 'barcode' },
    { l: 'အမျိုးအစားခွဲ', t: 'select', req: 1, opts: () => SAMPLE.cats, map: 'အမျိုးအစားစုခွဲ အမည်', k: 'cat' },
    { l: 'ယူနစ်', t: 'select', req: 1, opts: ['Unit', 'Box', 'Dozen', 'Pack', 'Set'], map: 'ယူနစ်', k: 'unit' },
    { l: 'သတိပေး အရေအတွက်', t: 'number', req: 1, p: 'သတိပေး အရေအတွက်', k: 'alertQty' },
  ]},
  /* purchase-orders and item-transfers open dedicated pages on the live site, not dialogs */
  '/main/account-transfers': { title: 'ငွေလွှဲပြောင်းမှု', fields: [
    { l: 'ငွေပေးပို့မည့်အကောင့်', t: 'select', req: 1, opts: () => SAMPLE.accounts, map: 'ငွေပေးပို့မည့်အကောင့်' },
    { l: 'ငွေလက်ခံမည့်အကောင့်', t: 'select', req: 1, opts: () => SAMPLE.accounts, map: 'ငွေလက်ခံမည့်အကောင့်' },
    { l: 'ပမာဏ', t: 'number', req: 1, p: 'လွှဲပြောင်း ငွေပမာဏ', map: 'ပမာဏ' },
    { l: 'မှတ်ချက်', t: 'textarea', map: 'မှတ်ချက်' },
  ]},
  '/main/currencies': { title: 'ငွေကြေး', fields: [
    { l: 'နိုင်ငံအမည်', t: 'text', req: 1, map: 'နိုင်ငံအမည်' },
    { l: 'သင်္ကေတ', t: 'text', req: 1, map: 'သင်္ကေတ' },
    { l: 'လဲလှယ်နှုန်း', t: 'text', req: 1, map: 'လဲလှယ်နှုန်း' },
  ]},
  '/main/expense-categories': { title: 'အသုံးစရိတ် အဓိကအမျိုးအစား', fields: [
    { l: 'အမည်', t: 'text', req: 1, p: 'အသုံးစရိတ် အမျိုးအစား အမည်', map: 'အမည်' },
  ]},
  '/main/expense-sub-categories': { title: 'အသုံးစရိတ် အမျိုးအစားခွဲ', fields: [
    { l: 'အမည်', t: 'text', req: 1, p: 'အသုံးစရိတ် အမျိုးအစားစုခွဲ အမည်', map: 'အမည်' },
    { l: 'အသုံးစရိတ်အမျိုးအစား', t: 'select', req: 1, opts: ['ဆိုင်စရိတ်', 'ဝန်ထမ်းစရိတ်'], map: 'အမျိုးအစားအမည်' },
  ]},
  '/main/expenses': { title: 'အသုံးစရိတ်', fields: [
    { l: 'အသုံးစရိတ်အမျိုးအစားခွဲ', t: 'select', req: 1, opts: ['မီးဖိုး', 'ဆိုင်ခန်းခ', 'လစာ'], map: 'အမျိုးအစားအမည်' },
    { l: 'ပမာဏ', t: 'number', req: 1, p: 'ပမာဏ ထည့်ပါ', map: 'ပမာဏ' },
    { l: 'ငွေအကောင့်', t: 'select', req: 1, opts: () => SAMPLE.accounts, map: 'ငွေပေးချေမည့်အကောင့်' },
    { l: 'ဖော်ပြချက်', t: 'textarea' },
  ]},
  '/setting/purchase': { title: 'ထပ်တိုးကုန်ကျစရိတ်', fields: [
    { l: 'အမည်', t: 'text', req: 1, p: 'အမျိုးအစားအမည်', map: 'အမည်' },
  ]},
};

/* payment dialog for supplier/customer payment pages */
const PAY_DIALOG = { title: 'ငွေပေးချေမူ', fields: [
  { l: 'အကြွေးပမာဏ', t: 'number', ro: 1, map: 'အကြွေးပမာဏ' },
  { l: 'ပေးချေမည့်ပမာဏ', t: 'number', req: 1 },
  { l: 'ငွေအကောင့်', t: 'select', req: 1, opts: () => SAMPLE.accounts },
  { l: 'ရက်စွဲ', t: 'date' },
  { l: 'မှတ်ချက်', t: 'textarea' },
]};

/* ===== sample-row generator (keyed by column-header keywords) ===== */
const SAMPLE = {
  customers: ['ကိုအောင်', 'မခင်', 'ဦးမြင့်', 'မသီတာ', 'ကိုဇော်'],
  suppliers: ['Golden Mobile', 'Star Distribution', 'ရွှေမန္တလာ ကုမ္ပဏီ', 'City Phone Supply', 'Lucky Trading'],
  users: ['admin', 'ရောင်းသူ ၁', 'ရောင်းသူ ၂', 'မန်နေဂျာ', 'စာရင်းကိုင်'],
  accounts: ['ငွေသား', 'KPay', 'Wave Money', 'CB Bank', 'AYA Bank'],
  items: ['Mi9a /4 46', 'Redmi /15c /6/128', 'Samsung A07 4128', 'Iphone13promax. /128', 'Note15pro Ram8/256'],
  cats: ['Phone New', 'Phone Second', 'Accessory', 'Service', 'Other'],
  countries: ['Myanmar', 'Thailand', 'China', 'USA', 'Singapore'],
  symbols: ['Ks', '฿', '¥', '$', 'S$'],
  emails: ['admin@maharpos.com', 'sale1@maharpos.com', 'sale2@maharpos.com', 'manager@maharpos.com', 'acc@maharpos.com'],
  notes: ['-', 'အမြန်ပို့ရန်', '-', 'စစ်ဆေးပြီး', '-'],
  dates: ['Jul 13, 2026', 'Jul 12, 2026', 'Jul 11, 2026', 'Jul 10, 2026', 'Jul 9, 2026'],
  amounts: [45000, 128500, 36000, 210000, 18500],
  bigAmounts: [1520000, 2450000, 780000, 3200000, 990000],
};

function sampleCell(col, i, route) {
  const c = col;
  const money = n => fmt(n) + ' MMK';
  if (c === 'စဉ်') return String(i + 1);
  if (c === '✓') return `<input type="checkbox">`;
  if (c === 'လုပ်ဆောင်ချက်') return null; // handled separately
  if (/ID$/.test(c) || c === 'ID') return 'INV-2026-0' + (861 - i);
  if (c.includes('အီးမေးလ်')) return SAMPLE.emails[i];
  if (c.includes('ဖုန်း')) return '09' + (960000000 + i * 111111);
  if (c.includes('အခန်းကဏ္ဍ')) return i === 0 ? 'Admin' : 'Sale';
  if (c.includes('လိပ်စာ')) return ['မန္တလေး', 'ရန်ကုန်', 'တောင်ကြီး', 'မကွေး', 'ပြင်ဦးလွင်'][i];
  if (c.includes('ဘားကုဒ်')) return '-';
  if (c.includes('နိုင်ငံအမည်')) return SAMPLE.countries[i];
  if (c.includes('သင်္ကေတ')) return SAMPLE.symbols[i];
  if (c.includes('လဲလှယ်နှုန်း')) return ['1', '120', '580', '4400', '3300'][i];
  if (c.includes('ဖောက်သည်')) return SAMPLE.customers[i];
  if (c.includes('ပစ္စည်းသွင်းသူ')) return SAMPLE.suppliers[i];
  if (c.includes('ငွေအကောင့်') && c.includes('လက်ကျန်')) return money(SAMPLE.bigAmounts[i]);
  if (c.includes('အကောင့်')) return SAMPLE.accounts[i];
  if (c.includes('လုပ်ငန်းနေရာ')) return 'ဆိုင် 1';
  if (c.includes('ပစ္စည်းအမည်')) return SAMPLE.items[i];
  if (c.includes('ယူနစ်')) return 'Unit';
  if (c.includes('အရေ') || c === 'အဖွင့်' || c === 'အပိတ်' || c === 'လက်ရှိ' || c.includes('အဝင်') || c.includes('အထွက်')) return String([12, 5, 30, 8, 21][i]);
  if (c.includes('အခြေအနေ')) return `<span class="badge-done">ပြီးစီး</span>`;
  if (c.includes('ရက်') || c === 'ရက်စွဲ') return SAMPLE.dates[i];
  if (c.includes('မှတ်ချက်')) return SAMPLE.notes[i];
  if (c.includes('ကုဒ်')) return 'C-00' + (i + 1);
  if (c.includes('အမြတ်')) return money([25000, 64000, 18000, 105000, 9000][i]);
  if (c.includes('အကြွေး')) return money([0, 50000, 0, 120000, 0][i]);
  if (c.includes('ပမာဏ') || c.includes('ဈေး') || c.includes('ငွေ') || c.includes('စုစုပေါင်း') || c.includes('ပို့ခ') || c.includes('လျှော့') || c.includes('လျော့')) return money(SAMPLE.amounts[i]);
  if (c.includes('အမျိုးအစား')) return SAMPLE.cats[i];
  if (c.includes('သူ')) return SAMPLE.users[i % 5];
  if (c.includes('အမည်')) {
    if (route.includes('user')) return SAMPLE.users[i];
    if (route.includes('customer')) return SAMPLE.customers[i];
    if (route.includes('supplier')) return SAMPLE.suppliers[i];
    if (route.includes('inventor')) return ['ဆိုင် 1', 'ဂိုဒေါင်', 'ဆိုင် 2', 'ရုံးခန်း', 'အွန်လိုင်း'][i];
    if (route.includes('categor')) return SAMPLE.cats[i];
    if (route.includes('unit')) return ['Unit', 'Box', 'Dozen', 'Pack', 'Set'][i];
    if (route.includes('item') || route.includes('pricing') || route.includes('stock')) return SAMPLE.items[i];
    return SAMPLE.cats[i];
  }
  return '-';
}

/* ===== modal (PrimeNG-style dialog) ===== */
function fieldHtml(f, value) {
  const req = f.req ? '<span class="req">*</span>' : '';
  const v = value != null ? String(value).replace(/ MMK$/, '').replace(/,/g, f.t === 'number' ? '' : ',') : '';
  const attr = `${f.ro ? 'readonly' : ''}`;
  let ctl;
  if (f.t === 'select') {
    const opts = typeof f.opts === 'function' ? f.opts() : (f.opts || []);
    ctl = `<select class="pos-select w-full" ${attr}>
      <option value="">ရွေးပါ</option>
      ${opts.map(o => `<option ${o === v ? 'selected' : ''}>${o}</option>`).join('')}
    </select>`;
  } else if (f.t === 'textarea') {
    ctl = `<textarea class="text-input dlg-textarea" rows="3" ${attr}>${v}</textarea>`;
  } else if (f.t === 'date') {
    ctl = `<input class="text-input" placeholder="${f.p || 'ရက်စွဲ ရွေးပါ'}" value="${v}" ${attr}>`;
  } else {
    ctl = `<input class="text-input" type="${f.t === 'password' ? 'password' : f.t === 'number' ? 'number' : 'text'}" placeholder="${f.p || ''}" value="${f.t === 'password' ? '' : v}" ${attr}>`;
  }
  return `<div class="dlg-field"><label class="field-label">${f.l}${req}</label>${ctl}</div>`;
}

function openDialog(cfg, mode, values, onSave) {
  closeDialog();
  const mask = document.createElement('div');
  mask.className = 'dlg-mask';
  mask.id = 'dlgMask';
  mask.innerHTML = `
    <div class="dlg" role="dialog">
      <div class="dlg-header">
        <span class="dlg-title">${mode === 'edit' ? 'ဒေတာပြင်ဆင်ပါ' : 'ဒေတာထည့်ပါ'}</span>
        <button class="dlg-close" id="dlgClose"><i class="pi pi-times"></i></button>
      </div>
      <div class="dlg-body">
        ${cfg.fields.map((f, i) => fieldHtml(f, values ? values[i] : null)).join('')}
      </div>
      <div class="dlg-footer">
        <button class="btn-sm-outline" id="dlgCancel">မလုပ်တော့ပါ</button>
        <button class="btn-sm-primary" id="dlgSave"><i class="pi pi-check"></i> သိမ်းဆည်းပါ</button>
      </div>
    </div>`;
  document.body.appendChild(mask);
  mask.addEventListener('click', e => { if (e.target === mask) closeDialog(); });
  document.getElementById('dlgClose').addEventListener('click', closeDialog);
  document.getElementById('dlgCancel').addEventListener('click', closeDialog);
  document.getElementById('dlgSave').addEventListener('click', () => {
    const missing = [...mask.querySelectorAll('.dlg-field')].some((div, i) => {
      const f = cfg.fields[i];
      if (!f.req) return false;
      const ctl = div.querySelector('input, select, textarea');
      return !ctl.value.trim();
    });
    if (missing) { showToast('လိုအပ်သည့် အချက်အလက်များ ဖြည့်ပါ'); return; }
    if (onSave) {
      const obj = {};
      [...mask.querySelectorAll('.dlg-field')].forEach((div, i) => {
        const f = cfg.fields[i];
        const ctl = div.querySelector('input, select, textarea');
        obj[f.k || f.map || f.l] = ctl.value.trim();
      });
      Promise.resolve(onSave(obj))
        .then(() => { closeDialog(); showToast(mode === 'edit' ? 'ပြင်ဆင်ပြီးပါပြီ' : 'သိမ်းဆည်းပြီးပါပြီ'); })
        .catch(() => showToast('သိမ်းဆည်းမှု မအောင်မြင်ပါ'));
      return;
    }
    closeDialog();
    showToast(mode === 'edit' ? 'ပြင်ဆင်ပြီးပါပြီ' : 'သိမ်းဆည်းပြီးပါပြီ');
  });
}

function closeDialog() {
  const m = document.getElementById('dlgMask');
  if (m) m.remove();
}

/* prefill values for edit: for each dialog field, read the matching column's sample cell */
function dialogValuesFromRow(route, cfg, rowIdx) {
  const cols = (PAGES[route] || {}).cols || [];
  return cfg.fields.map(f => {
    if (!f.map) return null;
    const col = cols.find(c => c === f.map) || f.map;
    const v = sampleCell(col, rowIdx, route);
    return v && !v.startsWith('<') ? v : null;
  });
}

/* cell value for an API record: record keys are the dialog fields' map/label names */
function recordCell(col, rec, i) {
  if (col === 'စဉ်') return String(i + 1);
  if (col === '✓') return `<input type="checkbox">`;
  let v = rec[col];
  if (v == null && col === 'ငွေအကောင့်လက်ကျန်') v = rec['အဖွင့်လက်ကျန်'];
  if (v == null) return '-';
  if (/လက်ကျန်|ပမာဏ/.test(col) && !isNaN(+String(v).replace(/,/g, ''))) {
    return fmt(+String(v).replace(/,/g, '')) + ' MMK';
  }
  return String(v);
}

function genericListPage(route, cfg, records) {
  const sort = '<i class="pi pi-sort-alt sort-ic"></i>';
  const btnHtml = (cfg.btns || []).map(b => {
    if (typeof b === 'object') return `<button class="btn-sm-primary">${b.label} <span class="btn-badge">${b.badge}</span></button>`;
    if (b === 'new') return `<button class="btn-sm-primary" data-dlg-new="${route}"><i class="pi pi-plus"></i> အသစ်</button>`;
    if (b === 'export') return `<button class="btn-sm-primary"><i class="pi pi-upload"></i> ဒေတာထုတ်မည်</button>`;
    if (b === 'import') return `<button class="btn-sm-primary"><i class="pi pi-upload"></i> ရွေးပါ</button>`;
    if (b === 'template') return `<button class="btn-sm-outline">မူလပုံစံ</button>`;
    if (b === 'search') return `<button class="btn-sm-primary"><i class="pi pi-search"></i> ရှာဖွေပါ</button>`;
    return '';
  }).join('');
  const filterHtml = (cfg.filters || []).map(f => {
    if (f.t === 'search') return `<input class="pos-select" placeholder="${f.p}">`;
    if (f.t === 'select') return `<select class="pos-select"><option>${f.l}</option></select>`;
    if (f.t === 'range') return `<select class="pos-select"><option>နေ့စဉ်</option><option>လစဉ်</option><option>နှစ်စဉ်</option></select>`;
    if (f.t === 'date') return `<input class="pos-select" placeholder="စတင်သည့်နေ့">`;
    return '';
  }).join('');
  const actionsTd = (route, i, recId) => `<td><div class="row-actions">${
    cfg.payAction
      ? `<button class="act-btn" title="ငွေပေးချေရန်" data-dlg-pay="${route}" data-row="${i}"><i class="pi pi-wallet"></i></button>`
      : `<button class="act-btn" title="ပြင်ဆင်ပါ" data-dlg-edit="${route}" data-row="${i}" ${recId != null ? `data-id="${recId}"` : ''}><i class="pi pi-pencil"></i></button>
         <button class="act-btn act-danger" title="ဖျက်ပါ" ${recId != null ? `data-del="${route}" data-id="${recId}"` : ''}><i class="pi pi-trash"></i></button>`
  }</div></td>`;
  const rows = records
    ? records.map((rec, i) => `<tr>${cfg.cols.map(col =>
        col === 'လုပ်ဆောင်ချက်' ? actionsTd(route, i, rec.id) : `<td>${recordCell(col, rec, i)}</td>`
      ).join('')}</tr>`).join('')
    : Array.from({ length: 5 }, (_, i) => `<tr>${cfg.cols.map(col =>
        col === 'လုပ်ဆောင်ချက်' ? actionsTd(route, i, null) : `<td>${sampleCell(col, i, route)}</td>`
      ).join('')}</tr>`).join('');
  const count = records ? records.length : 5;
  return `
  ${btnHtml ? `<div class="items-actions">${btnHtml}</div>` : ''}
  <div class="card items-card">
    <div class="items-card-header">
      <h3>${cfg.title}</h3>
      <div class="filters-row">${filterHtml}</div>
    </div>
    <div class="pos-table-wrap">
      <table class="data-table items-table">
        <thead><tr>${cfg.cols.map(c => `<th>${c === 'စဉ်' || c === '✓' || c === 'လုပ်ဆောင်ချက်' ? c : c + ' ' + sort}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${cfg.noPag ? '' : `
    <div class="paginator">
      <span class="pag-current">${count ? `1 to ${count} of ${count}` : '0 of 0'}</span>
      <button class="pag-btn" disabled><i class="pi pi-angle-double-left"></i></button>
      <button class="pag-btn" disabled><i class="pi pi-angle-left"></i></button>
      <button class="pag-btn pag-num pag-active">1</button>
      <button class="pag-btn" disabled><i class="pi pi-angle-right"></i></button>
      <button class="pag-btn" disabled><i class="pi pi-angle-double-right"></i></button>
      <select class="pos-select pag-rows"><option>10</option><option>25</option><option>50</option></select>
    </div>`}
  </div>`;
}

/* ===== special pages ===== */

/* /home/purchases — purchase entry screen (POS-like) */
function purchasePage() {
  const left = ITEMS.slice(0, 12).map((it, i) => `
    <tr>
      <td>${i + 1}</td><td>${it.name}</td><td>${it.qty}</td>
      <td>${fmt(Math.round(it.price * .8))} MMK</td><td>Unit</td>
      <td><button class="pos-add-btn" data-padd="${it.id}"><i class="pi pi-plus"></i></button></td>
    </tr>`).join('');
  return `
  <div class="pos-page">
    <div class="pos-panel pos-left">
      <div class="pos-left-header">
        <select class="pos-select"><option>အမျိုးအစား ရွေးပါ</option></select>
        <input class="pos-search" placeholder="ပစ္စည်း ရှာဖွေပါ...">
      </div>
      <div class="pos-table-wrap">
        <table class="pos-table">
          <thead><tr><th>စဉ်</th><th>ပစ္စည်းအမည်</th><th>အရေ အတွက်</th><th>ဝယ်ဈေး</th><th>ယူနစ်</th><th></th></tr></thead>
          <tbody>${left}</tbody>
        </table>
      </div>
    </div>
    <div class="pos-panel pos-right">
      <div class="pos-right-header">
        <select class="pos-select pos-customer"><option>ပစ္စည်းသွင်းသူကို ရွေးပါ*</option>${SAMPLE.suppliers.map(s => `<option>${s}</option>`).join('')}</select>
        <select class="pos-select pos-customer"><option>လုပ်ငန်းနေရာကို ရွေးပါ*</option><option>ဆိုင် 1</option></select>
        <select class="pos-select"><option>Myanmar</option></select>
      </div>
      <div class="pos-table-wrap pos-cart-wrap">
        <table class="pos-table">
          <thead><tr><th>စဉ်</th><th>ပစ္စည်းအမည်</th><th>အရေ အတွက်</th><th>ယူနစ်</th><th>ဝယ်ဈေး</th><th>လက်လီဈေး</th><th>လက္ကားဈေး</th><th>စုစုပေါင်း</th><th></th></tr></thead>
          <tbody id="purchaseCartBody"></tbody>
        </table>
      </div>
    </div>
    <div class="pos-footer">
      <div class="pos-footer-right">
        <div class="pos-total">စုစုပေါင်း: <span id="purchaseTotal">0 MMK</span></div>
        <button class="pos-pay-btn" id="purchaseSubmit"><i class="pi pi-check"></i> ဝယ်ယူမှု</button>
      </div>
    </div>
  </div>`;
}

function wirePurchase() {
  const cart = [];
  const page = document.querySelector('.pos-page');
  const render = () => {
    document.getElementById('purchaseCartBody').innerHTML = cart.map((c, i) => `
      <tr>
        <td>${i + 1}</td><td>${c.name}</td>
        <td><input class="cart-qty" type="number" min="1" value="${c.qty}" data-pqty="${i}"></td>
        <td>Unit</td>
        <td><input class="cart-qty" type="number" value="${c.buy}" data-pbuy="${i}"></td>
        <td><input class="cart-qty" type="number" value="${c.retail}"></td>
        <td><input class="cart-qty" type="number" value="${c.wholesale}"></td>
        <td>${fmt(c.buy * c.qty)} MMK</td>
        <td><button class="cart-del-btn" data-pdel="${i}"><i class="pi pi-trash"></i></button></td>
      </tr>`).join('');
    document.getElementById('purchaseTotal').textContent = fmt(cart.reduce((s, c) => s + c.buy * c.qty, 0)) + ' MMK';
  };
  page.addEventListener('click', e => {
    const add = e.target.closest('[data-padd]');
    if (add) {
      const it = ITEMS.find(x => x.id === +add.dataset.padd);
      const line = cart.find(c => c.id === it.id);
      if (line) line.qty += 1;
      else cart.push({ id: it.id, name: it.name, qty: 1, buy: Math.round(it.price * .8), retail: it.price, wholesale: Math.round(it.price * .95) });
      render();
    }
    const del = e.target.closest('[data-pdel]');
    if (del) { cart.splice(+del.dataset.pdel, 1); render(); }
    if (e.target.closest('#purchaseSubmit')) {
      if (!cart.length) { showToast('ပစ္စည်း ရွေးပါ'); return; }
      const purchase = {
        supplier: document.querySelector('.pos-customer')?.value || '-',
        items: cart.map(c => ({ id: c.id, name: c.name, qty: c.qty, buy: c.buy })),
        total: cart.reduce((s, c) => s + c.buy * c.qty, 0),
        payment: 'ငွေသား',
      };
      api.create('purchases', purchase)
        .then(rec => {
          showToast(`PUR-${String(rec.id).padStart(4, '0')} ဝယ်ယူမှု သိမ်းဆည်းပြီးပါပြီ`);
          cart.length = 0; render();
        })
        .catch(() => showToast('သိမ်းဆည်းမှု မအောင်မြင်ပါ'));
    }
  });
  page.addEventListener('input', e => {
    if (e.target.dataset.pqty !== undefined) { cart[+e.target.dataset.pqty].qty = Math.max(1, +e.target.value || 1); render(); }
    if (e.target.dataset.pbuy !== undefined) { cart[+e.target.dataset.pbuy].buy = +e.target.value || 0; render(); }
  });
}

/* /report/trading-reports — trading statement */
function tradingReportPage() {
  const row = (label, val, cls) => `<tr class="${cls || ''}"><td>${label}</td><td class="tr-amount">${val}</td></tr>`;
  return `
  <div class="items-actions">
    <button class="btn-sm-primary"><i class="pi pi-upload"></i> ဒေတာထုတ်မည်</button>
    <button class="btn-sm-outline">မူလပုံစံ</button>
    <select class="pos-select"><option>နေ့စဉ်</option><option>လစဉ်</option><option>နှစ်စဉ်</option></select>
    <input class="pos-select" placeholder="စတင်သည့်နေ့">
  </div>
  <div class="card items-card trading-card">
    <h3>ကုန်သွယ်မှု အစီရင်ခံစာ</h3>
    <table class="data-table trading-table">
      ${row('<b>Sales</b>', '', 'tr-section')}
      ${row('Total Sale Amount', '1,520,000 MMK')}
      ${row('Total Sale Return Amount(-)', '0 MMK')}
      ${row('<b>Net Sale Amount</b>', '<b>1,520,000 MMK</b>')}
      ${row('<b>Cost Of Good Sold</b>', '', 'tr-section')}
      ${row('Opening Inventory', '66,508,500 MMK')}
      ${row('Closing Inventory(-)', '65,308,500 MMK')}
      ${row('Purchase Amount', '0 MMK')}
      ${row('Additional Purchase Expense Amount', '0 MMK')}
      ${row('Purchase Return Amount(-)', '0 MMK')}
      ${row('<b>COGS</b>', '<b>1,200,000 MMK</b>')}
      ${row('<b>Gross Profit</b>', '<b>320,000 MMK</b>', 'tr-section')}
      ${row('<b>Expenses(-)</b>', '', 'tr-section')}
      ${row('လစဉ်ကုန်ကျစရိတ်', '50,000 MMK')}
      ${row('<b>Net Profit</b>', '<b>270,000 MMK</b>', 'tr-total')}
    </table>
  </div>`;
}

/* /setting/*-prints — print settings + receipt preview */
function printSettingPage(route) {
  const previews = {
    '/setting/sale-prints': ['စဉ်', 'ပစ္စည်းအမည်', 'အရေ အတွက်', 'ယူနစ်', 'ဈေးနှုန်း', 'လျှော့စျေး', 'စုစုပေါင်း'],
    '/setting/purchase-prints': ['စဉ်', 'ပစ္စည်းအမည်', 'အရေ အတွက်', 'ယူနစ်', 'ဈေးနှုန်း', 'စုစုပေါင်း'],
    '/setting/receipt-prints': null,
    '/setting/transaction-prints': ['စဉ်', 'လုပ်ငန်းနေရာအမည်', 'ပစ္စည်းအမည်', 'အရေ အတွက်'],
    '/setting/transfer-prints': ['စဉ်', 'ပို့မည့် လုပ်ငန်းနေရာ', 'လက်ခံမည့် လုပ်ငန်းနေရာ', 'ပစ္စည်းအမည်', 'အရေ အတွက်'],
  };
  const cols = previews[route];
  const isSale = route === '/setting/sale-prints';
  return `
  <div class="grid-2 print-setting-grid">
    <div class="card">
      <h3>ပရင့်ဆက်တင်</h3>
      ${isSale ? `
      <label class="field-label">စက္ကူအရွယ်အစား</label>
      <select class="pos-select w-full"><option>ရွေးပါ</option><option>80mm</option><option>58mm</option><option>A4</option></select>
      <label class="field-label">Auto Print</label>
      <select class="pos-select w-full"><option>No</option><option>Yes</option></select>` : ''}
      <label class="field-label">ခေါင်းစဉ်</label>
      <input class="text-input" placeholder="ဘောင်ချာ ခေါင်းစဉ်">
      <label class="field-label">အောက်ခြေ</label>
      <input class="text-input" placeholder="ကျေးဇူးတင်ပါသည်">
      <button class="btn-primary mt-1">ပရင့်ဆက်တင်သိမ်းဆည်းရန်</button>
    </div>
    <div class="card">
      <h3>ပရင့်ပုံစံကြည့်ရှုခြင်း</h3>
      <div class="receipt-preview">
        <div class="rp-title">Mahar POS</div>
        <div class="rp-sub">Mahar Shwe Mobile</div>
        <div class="rp-line">ဘောင်ချာနံပါတ်: INV-2026-0861</div>
        <div class="rp-line">ရက်စွဲ: Jul 13, 2026</div>
        <hr>
        ${cols ? `
        <table class="rp-table">
          <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
          <tbody><tr>${cols.map((c, i) => `<td>${i === 0 ? '1' : c.includes('ပစ္စည်း') ? 'Mi9a /4 46' : c.includes('စုစုပေါင်း') || c.includes('ဈေး') ? '200,000' : c.includes('ယူနစ်') ? 'Unit' : c.includes('လျှော့') ? '0' : c.includes('နေရာ') ? 'ဆိုင် 1' : '1'}</td>`).join('')}</tr></tbody>
        </table>` : `
        <div class="rp-line">ငွေလက်ခံပြေစာ</div>
        <div class="rp-line">ဖောက်သည်: ကိုအောင်</div>
        <div class="rp-line">ပမာဏ: 200,000 MMK</div>`}
        <hr>
        <div class="rp-line rp-total">စုစုပေါင်း: 200,000 MMK</div>
        <div class="rp-sub">ကျေးဇူးတင်ပါသည်</div>
      </div>
    </div>
  </div>`;
}

/* /setting/business — business profile */
function businessPage() {
  const row = (label, value, input) => `
    <tr><td class="bp-label">${label}</td><td>${input || value}</td></tr>`;
  return `
  <div class="card items-card">
    <h3>လုပ်ငန်းပရိုဖိုင်</h3>
    <table class="data-table bp-table">
      ${row('လုပ်ငန်းအမည်', '', '<input class="text-input" value="Mahar Shwe Mobile">')}
      ${row('ဖုန်းနံပါတ်', '', '<input class="text-input" value="09989540814">')}
      ${row('လိပ်စာ', '', '<input class="text-input" value="တောင်ကြီး">')}
      ${row('ပြည်နယ်/တိုင်းဒေသကြီး', '', '<select class="pos-select w-full"><option>Shan</option><option>Yangon</option><option>Mandalay</option></select>')}
      ${row('အကောင့်အမျိုးအစား', '<span class="badge-done">Paid</span>')}
      ${row('ပြီးဆုံးသည့်နေ့', 'Jul 22, 2026')}
      ${row('ပစ္စည်းကန့်သတ်ချက်', '500')}
      ${row('အသုံးပြုသူကန့်သတ်ချက်', '1')}
      ${row('လုပ်ငန်းနေရာကန့်သတ်ချက်', '1')}
    </table>
    <button class="btn-primary mt-1 w-auto">အပ်ဒိတ်လုပ်ရန်</button>
  </div>`;
}

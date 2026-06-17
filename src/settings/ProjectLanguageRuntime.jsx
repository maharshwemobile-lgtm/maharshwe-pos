import React, { useEffect } from 'react';

const MYANMAR = {
  Dashboard: 'ဒက်ရှ်ဘုတ်',
  'Sale POS': 'အရောင်း POS',
  'Sales History': 'အရောင်းမှတ်တမ်း',
  'Repair Platform': 'ဖုန်းပြင်စနစ်',
  'Partner & Settlement': 'မိတ်ဖက်နှင့်စာရင်းရှင်း',
  Products: 'ကုန်ပစ္စည်းများ',
  Stock: 'စတော့',
  Purchases: 'အဝယ်စာရင်း',
  'Customers & Credit': 'ဖောက်သည်နှင့်အကြွေး',
  'Finance & Accounts': 'ငွေစာရင်း',
  'Reports & Performance': 'အစီရင်ခံစာ',
  'Audit Trail': 'လုပ်ဆောင်မှုမှတ်တမ်း',
  'Backup & Recovery': 'Backup နှင့် Recovery',
  'Project Settings': 'Project Settings',
  Logout: 'ထွက်မည်',
  Refresh: 'ပြန်လည်ဖတ်မည်',
  Save: 'သိမ်းမည်',
  'My Preference': 'ကျွန်ုပ်၏ Preference',
  'Slip Information': 'Slip အချက်အလက်',
  'Business Profile': 'လုပ်ငန်းအချက်အလက်',
  'Appearance & Language': 'အပြင်အဆင်နှင့်ဘာသာစကား',
  'API Configure': 'API ချိတ်ဆက်မှု',
  'Users & Access': 'User နှင့်အသုံးပြုခွင့်',
  'PostgreSQL Settings': 'PostgreSQL Settings',
  'Save My Preference': 'Preference သိမ်းမည်',
  'Save Slip Information': 'Slip အချက်အလက်သိမ်းမည်',
  'Save Business Profile': 'လုပ်ငန်းအချက်အလက်သိမ်းမည်',
  'Save Appearance': 'အပြင်အဆင်သိမ်းမည်',
  'Save API': 'API သိမ်းမည်',
  'Save PostgreSQL Settings': 'PostgreSQL Settings သိမ်းမည်',
  'Default Language': 'ပုံသေဘာသာစကား',
  'Default Theme': 'ပုံသေအပြင်အဆင်',
  'Business Name': 'လုပ်ငန်းအမည်',
  Subtitle: 'စာတန်းခွဲ',
  'Primary Phone': 'အဓိကဖုန်း',
  'Secondary Phone': 'ဒုတိယဖုန်း',
  Address: 'လိပ်စာ',
  'Township / Region': 'မြို့နယ် / ဒေသ',
  Website: 'Website',
  'Google Map URL': 'Google Map လင့်ခ်',
  'KBZ Pay Number': 'KBZ Pay နံပါတ်',
  'Wave Pay Number': 'Wave Pay နံပါတ်',
  'License Status': 'License အခြေအနေ',
  'Repair Voucher Print': 'Repair Voucher ထုတ်မည်',
  'New Repair': 'Repair အသစ်',
  'Advanced Repair Platform': 'အဆင့်မြင့်ဖုန်းပြင်စနစ်',
  'PHASE 7 · REPAIR': 'PHASE 7 · REPAIR',
};

const ENGLISH = Object.fromEntries(Object.entries(MYANMAR).map(([en, my]) => [my, en]));

function translateNode(node, language) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return;
  const raw = node.nodeValue;
  const trimmed = raw.trim();
  if (!trimmed) return;
  const dictionary = language === 'my' ? MYANMAR : ENGLISH;
  const translated = dictionary[trimmed];
  if (!translated || translated === trimmed) return;
  node.nodeValue = raw.replace(trimmed, translated);
}

function translateTree(root, language) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (parent && !['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION', 'CODE', 'PRE'].includes(parent.tagName)) {
      translateNode(node, language);
    }
    node = walker.nextNode();
  }
}

export function applyProjectLanguage(language) {
  const safeLanguage = language === 'en' ? 'en' : 'my';
  document.documentElement.lang = safeLanguage;
  document.documentElement.dataset.language = safeLanguage;
  translateTree(document.body, safeLanguage);
}

export default function ProjectLanguageRuntime({ children }) {
  useEffect(() => {
    let activeLanguage = document.documentElement.lang === 'en' ? 'en' : 'my';
    translateTree(document.body, activeLanguage);

    const bodyObserver = new MutationObserver((entries) => {
      entries.forEach((entry) => entry.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) translateNode(node, activeLanguage);
        else if (node.nodeType === Node.ELEMENT_NODE) translateTree(node, activeLanguage);
      }));
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    const languageObserver = new MutationObserver(() => {
      const nextLanguage = document.documentElement.lang === 'en' ? 'en' : 'my';
      if (nextLanguage === activeLanguage) return;
      activeLanguage = nextLanguage;
      translateTree(document.body, activeLanguage);
    });
    languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

    return () => {
      bodyObserver.disconnect();
      languageObserver.disconnect();
    };
  }, []);

  return children;
}

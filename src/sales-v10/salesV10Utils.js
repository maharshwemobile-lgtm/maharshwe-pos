const DRAFT_TTL = 12 * 60 * 60 * 1000;

export function money(value) {
  return `${Number(value || 0).toLocaleString('en-US')} ကျပ်`;
}

export function shortMoney(value) {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(amount % 1_000_000 ? 1 : 0)}M`;
  if (Math.abs(amount) >= 1_000) return `${Math.round(amount / 1_000)}K`;
  return String(amount);
}

export function productName(item) {
  return [item?.productName, item?.variantName].filter(Boolean).join(' · ') || 'Unnamed product';
}

export function reservedQuantity(cart = []) {
  return cart.reduce((map, line) => {
    map.set(line.id, (map.get(line.id) || 0) + Number(line.quantity || 0));
    return map;
  }, new Map());
}

function draftKey(session) {
  return `mahar_phase10_sale:${session?.user?.id || session?.user?.username || 'default'}`;
}

export function loadDraft(session) {
  try {
    const value = JSON.parse(localStorage.getItem(draftKey(session)) || 'null');
    if (!value?.savedAt || Date.now() - value.savedAt > DRAFT_TTL) {
      localStorage.removeItem(draftKey(session));
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function saveDraft(session, payload) {
  try {
    localStorage.setItem(draftKey(session), JSON.stringify({ ...payload, savedAt: Date.now() }));
  } catch {
    // Draft persistence is optional.
  }
}

export function clearDraft(session) {
  localStorage.removeItem(draftKey(session));
}

let audioContext;
export function playScanTone() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioContext ||= new AudioContextClass();
    if (audioContext.state === 'suspended') audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(740, now);
    oscillator.frequency.exponentialRampToValueAtTime(1180, now + 0.075);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.13);
  } catch {
    // Browser audio can be blocked until the first user gesture.
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function reprintReceipt(sale, targetWindow = null) {
  const popup = targetWindow || window.open('', '_blank', 'width=430,height=760');
  if (!popup) return false;
  const items = (sale.itemRows || sale.items || []).map((item) => `
    <tr>
      <td>${escapeHtml([item.productName, item.variantName].filter(Boolean).join(' · '))}${item.imeiSerial ? `<small>${escapeHtml(item.imeiSerial)}</small>` : ''}</td>
      <td class="center">${Number(item.quantity || 0)}</td>
      <td class="right">${Number(item.unitPrice || 0).toLocaleString()}</td>
      <td class="right">${(Number(item.unitPrice || 0) * Number(item.quantity || 0)).toLocaleString()}</td>
    </tr>`).join('');
  const isVoided = String(sale.status || sale.raw?.status || '').toUpperCase().includes('VOID');

  popup.document.open();
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(sale.invoice || sale.invoiceNumber)}</title>
  <style>
    body{font-family:Arial,sans-serif;color:#111;margin:0;padding:18px;font-size:12px}h1,p{text-align:center;margin:3px 0}h1{font-size:20px}.muted{color:#555}.void{margin:10px 0;padding:7px;border:2px solid #b91c1c;color:#b91c1c;font-weight:bold;text-align:center;letter-spacing:2px}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{padding:7px 3px;border-bottom:1px dashed #999;vertical-align:top}th{text-align:left}.center{text-align:center}.right{text-align:right}small{display:block;color:#555;margin-top:3px}.summary{margin-top:14px}.summary div{display:flex;justify-content:space-between;padding:4px 0}.grand{font-size:17px;font-weight:bold;border-top:2px solid #111;margin-top:5px;padding-top:8px}.footer{margin-top:22px;text-align:center;border-top:1px dashed #777;padding-top:12px}
  </style></head><body>
    <h1>Mahar Shwe Mobile</h1><p>Sale Receipt</p><p class="muted">${escapeHtml(sale.invoice || sale.invoiceNumber)}</p><p class="muted">${escapeHtml(new Date(sale.dateTime || sale.date || Date.now()).toLocaleString())}</p>${isVoided ? '<div class="void">VOIDED</div>' : ''}
    <table><thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Price</th><th class="right">Total</th></tr></thead><tbody>${items}</tbody></table>
    <div class="summary"><div><span>Subtotal</span><b>${Number(sale.subtotal || sale.amount || 0).toLocaleString()}</b></div><div><span>Discount</span><b>${Number(sale.discount || 0).toLocaleString()}</b></div><div class="grand"><span>Total</span><b>${Number(sale.amount || sale.total || 0).toLocaleString()} MMK</b></div><div><span>Payment</span><b>${escapeHtml(sale.payment || sale.paymentMethod || '-')}</b></div><div><span>Customer</span><b>${escapeHtml(sale.customer || 'Walk-in Customer')}</b></div></div>
    <div class="footer">Thank you for choosing Mahar Shwe Mobile.</div><script>window.onload=()=>window.print();</script>
  </body></html>`);
  popup.document.close();
  return true;
}

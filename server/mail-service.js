const nodemailer = require("nodemailer");

const DEFAULT_APP_URL = "https://app.maharshwe.shop";
const DEFAULT_COMMUNITY_URL = "https://t.me/+2gc9ml7iMgk1ZThl";
const DEFAULT_SUPPORT_TELEGRAM = "https://t.me/Mylifemychoice68";
const DEFAULT_SUBJECT = "Mahar Mobile Shop POS Account Activated / အကောင့်ဖွင့်ပြီးပါပြီ";

function appUrl() {
  return String(process.env.APP_PUBLIC_URL || process.env.PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, "");
}

function resendConfig() {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(
    process.env.RESEND_FROM ||
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    "Mahar Mobile Shop POS <no-reply@maharshwe.shop>"
  ).trim();
  const replyTo = String(process.env.RESEND_REPLY_TO || process.env.EMAIL_REPLY_TO || "maharshwemobile@gmail.com").trim();
  return {
    ready: Boolean(apiKey && from),
    apiKey,
    from,
    replyTo,
  };
}

function emailApiConfig() {
  const url = String(process.env.EMAIL_API_URL || "").trim();
  const token = String(process.env.EMAIL_API_TOKEN || "").trim();
  const fromEmail = String(process.env.EMAIL_FROM_EMAIL || process.env.SMTP_FROM || process.env.MAIL_FROM || "").trim();
  const fromName = String(process.env.EMAIL_FROM_NAME || "Mahar Shwe POS").trim();
  const replyTo = String(process.env.EMAIL_REPLY_TO || "maharshwemobile@gmail.com").trim();

  return {
    ready: Boolean(url && token),
    url,
    token,
    fromEmail,
    fromName,
    replyTo,
  };
}

function smtpConfig() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  const from = String(process.env.SMTP_FROM || process.env.MAIL_FROM || "").trim();

  return {
    ready: Boolean(host && from),
    host,
    port,
    secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465,
    auth: user && pass ? { user, pass } : undefined,
    from,
  };
}

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 14; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${out.slice(0, 4)}-${out.slice(4, 9)}-${out.slice(9)}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeMessage(error) {
  return String(error?.message || error || "EMAIL_SEND_FAILED")
    .replace(/re_[A-Za-z0-9_\-]+/g, "[redacted-resend-key]")
    .replace(/[A-Za-z0-9]{4}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}/g, "[redacted]");
}

function formatDate(value) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

function money(value) {
  const n = Number(value || 0);
  return `${n.toLocaleString("en-US")} Ks`;
}

function invoiceConfig(safe) {
  const monthlyFee = Number(process.env.POS_MONTHLY_FEE || safe.monthlyFee || 50000);
  const yearlyFee = Number(process.env.POS_YEARLY_FEE || 500000);
  const paidAmount = Number(process.env.POS_PAID_AMOUNT || 0);
  const promotionNote = String(process.env.POS_PROMOTION_NOTE || "Promotion / invoice details can be adjusted by Grand Admin.").trim();
  return {
    monthlyFee,
    yearlyFee,
    paidAmount,
    promotionNote,
  };
}

function buildInvoicePdf({ safe, invoice }) {
  const lines = [
    "Mahar Mobile Shop POS",
    "Invoice / Payment Confirmation",
    "",
    `Owner: ${safe.name}`,
    `Shop Name: ${safe.shopName}`,
    `Shop ID: ${safe.tenantId}`,
    `Tenant: ${safe.shopSlug}`,
    `Email: ${safe.email}`,
    `Username: ${safe.username}`,
    `Plan: ${safe.planLabel}`,
    `Expiry Date: ${safe.expiryDate}`,
    "",
    `Monthly Fee: ${money(invoice.monthlyFee)}`,
    `Yearly Fee: ${money(invoice.yearlyFee)}`,
    invoice.paidAmount > 0 ? `Paid Amount: ${money(invoice.paidAmount)}` : "Paid Amount: To be confirmed",
    `Note: ${invoice.promotionNote}`,
    "",
    "Login URL: https://app.maharshwe.shop",
    "Support: https://t.me/Mylifemychoice68",
  ];
  const stream = lines.map((line, index) => `BT /F1 12 Tf 50 ${760 - index * 18} Td (${String(line).replace(/[\\()]/g, "\\$&")}) Tj ET`).join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${obj}\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf).toString("base64");
}

function buildWelcomeEmail(safe) {
  const invoice = invoiceConfig(safe);
  const communityUrl = String(process.env.POS_COMMUNITY_URL || DEFAULT_COMMUNITY_URL).trim();
  const supportTelegram = String(process.env.POS_SUPPORT_TELEGRAM || DEFAULT_SUPPORT_TELEGRAM).trim();
  const subject = String(process.env.POS_WELCOME_EMAIL_SUBJECT || DEFAULT_SUBJECT).trim();

  const text = [
    "Mahar Mobile Shop POS System သို့ ကြိုဆိုပါတယ် 🙏",
    "",
    "သင့်အကောင့်ကို အောင်မြင်စွာ ဖွင့်လှစ်ပြီးပါပြီ။ ဒီ account နဲ့ login ဝင်ပြီး စတင်အသုံးပြုနိုင်ပါပြီ။",
    "",
    "Account Details",
    `Owner: ${safe.name}`,
    `Shop Name: ${safe.shopName}`,
    `Shop ID: ${safe.tenantId}`,
    `Tenant: ${safe.shopSlug}`,
    `Email: ${safe.email}`,
    `Username: ${safe.username}`,
    `Temporary Password: ${safe.temporaryPassword}`,
    `Plan: ${safe.planLabel}`,
    `Expiry Date: ${safe.expiryDate}`,
    `Login URL: ${safe.loginUrl}`,
    "",
    "Next Step",
    "Login ဝင်ပြီး Password ကို ချက်ချင်းပြောင်းပေးပါ",
    "System အသုံးပြုရန် အခက်အခဲရှိပါက Support Team ကို ဆက်သွယ်နိုင်ပါတယ်",
    "",
    "Invoice / Payment Confirmation",
    `တစ်လစာ ${money(invoice.monthlyFee)} ဖြစ်ပြီး တစ်နှစ်စာ ${money(invoice.yearlyFee)} ဖြစ်ပါသည်။`,
    invoice.paidAmount > 0 ? `Promotion မှ ပေးချေပြီးသား: ${money(invoice.paidAmount)}` : invoice.promotionNote,
    "Invoice PDF ကို attachment အဖြစ် ပူးတွဲပေးထားပါတယ်။",
    "",
    `Telegram Group: ${communityUrl}`,
    `Support: ${supportTelegram}`,
    "",
    "Best regards,",
    "Mahar Mobile Shop POS Team",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,'Noto Sans Myanmar',sans-serif;line-height:1.65;color:#111827;max-width:720px;margin:auto;background:#ffffff">
      <div style="background:#0f172a;color:#fff;padding:22px;border-radius:16px 16px 0 0">
        <h2 style="margin:0">Mahar Mobile Shop POS Account Activated</h2>
        <div style="opacity:.85;margin-top:6px">အကောင့်ဖွင့်ပြီးပါပြီ</div>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:0;padding:22px;border-radius:0 0 16px 16px">
        <p><b>Mahar Mobile Shop POS System သို့ ကြိုဆိုပါတယ် 🙏</b></p>
        <p>သင့်အကောင့်ကို အောင်မြင်စွာ ဖွင့်လှစ်ပြီးပါပြီ။ ဒီ account နဲ့ login ဝင်ပြီး စတင်အသုံးပြုနိုင်ပါပြီ။</p>

        <h3>🧾 Account Details</h3>
        <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;background:#f8fafc;border-radius:12px;overflow:hidden">
          <tr><td><b>👤 Owner</b></td><td>${escapeHtml(safe.name)}</td></tr>
          <tr><td><b>🏪 Shop Name</b></td><td>${escapeHtml(safe.shopName)}</td></tr>
          <tr><td><b>🆔 Shop ID</b></td><td>${escapeHtml(safe.tenantId)}</td></tr>
          <tr><td><b>🏷️ Tenant</b></td><td>${escapeHtml(safe.shopSlug)}</td></tr>
          <tr><td><b>📧 Email</b></td><td>${escapeHtml(safe.email)}</td></tr>
          <tr><td><b>🔑 Username</b></td><td>${escapeHtml(safe.username)}</td></tr>
          <tr><td><b>🔐 Temporary Password</b></td><td><code style="font-size:16px;background:#fff3cd;padding:4px 8px;border-radius:6px">${escapeHtml(safe.temporaryPassword)}</code></td></tr>
          <tr><td><b>📌 Plan</b></td><td>${escapeHtml(safe.planLabel)}</td></tr>
          <tr><td><b>📅 Expiry Date</b></td><td>${escapeHtml(safe.expiryDate)}</td></tr>
          <tr><td><b>🔗 Login URL</b></td><td><a href="${escapeHtml(safe.loginUrl)}">${escapeHtml(safe.loginUrl)}</a></td></tr>
        </table>

        <h3>⚙️ Next Step</h3>
        <p>👉 Login ဝင်ပြီး Password ကို ချက်ချင်းပြောင်းပေးပါ<br/>👉 System အသုံးပြုရန် အခက်အခဲရှိပါက Support Team ကို ဆက်သွယ်နိုင်ပါတယ်</p>

        <h3>🧾 Invoice / Payment Confirmation</h3>
        <p>တစ်လစာ <b>${money(invoice.monthlyFee)}</b> ဖြစ်ပြီး တစ်နှစ်စာ <b>${money(invoice.yearlyFee)}</b> ဖြစ်ပါသည်။ ${invoice.paidAmount > 0 ? `Promotion မှ <b>${money(invoice.paidAmount)}</b> ပေးချေပြီးကြောင်း အတည်ပြုပါတယ်။` : escapeHtml(invoice.promotionNote)} Invoice PDF ကို attachment အဖြစ် ပူးတွဲပေးထားပါတယ်။</p>

        <h3>👥 For Community</h3>
        <p>Telegram Group ထဲ Join ပေးပါ:<br/><a href="${escapeHtml(communityUrl)}">${escapeHtml(communityUrl)}</a></p>

        <h3>📱 Support</h3>
        <p>Telegram: <a href="${escapeHtml(supportTelegram)}">${escapeHtml(supportTelegram)}</a></p>

        <p>Mahar Mobile Shop POS Team မှ ကြိုဆိုပါတယ်။<br/>သင့်လုပ်ငန်းကို Digital စနစ်နဲ့ အဆင့်မြှင့်တင်နိုင်ရန် ကျွန်တော်တို့ အမြဲကူညီပေးပါမယ်။</p>
        <p>If you need help, feel free to contact us anytime.</p>
        <p>Best regards,<br/><b>Mahar Mobile Shop POS Team</b></p>
      </div>
    </div>
  `;

  const attachments = [
    {
      filename: "mahar-pos-invoice.pdf",
      content: buildInvoicePdf({ safe, invoice }),
    },
  ];

  return { subject, text, html, attachments };
}

async function sendViaResend({ to, subject, text, html, attachments }) {
  const config = resendConfig();
  if (!config.ready || !to) return { skipped: true, reason: "RESEND_NOT_CONFIGURED" };
  if (typeof fetch !== "function") return { skipped: true, reason: "FETCH_NOT_AVAILABLE" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        from: config.from,
        to: [to],
        reply_to: config.replyTo,
        subject,
        text,
        html,
        attachments,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { skipped: true, reason: data?.message || `RESEND_${response.status}` };
    return { skipped: false, provider: "resend", messageId: data?.id || null, status: "sent" };
  } catch (error) {
    return { skipped: true, reason: safeMessage(error) };
  } finally {
    clearTimeout(timer);
  }
}

async function sendViaEmailAgent({ to, subject, safe }) {
  const config = emailApiConfig();
  if (!config.ready || !to) {
    return { skipped: true, reason: "EMAIL_API_NOT_CONFIGURED" };
  }

  if (typeof fetch !== "function") {
    return { skipped: true, reason: "FETCH_NOT_AVAILABLE" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  const idempotencySeed = safe.tenantId || safe.shopSlug || safe.username || to;

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `google-temp-password-${encodeURIComponent(idempotencySeed)}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        to: {
          email: to,
          name: safe.name || safe.username || to,
        },
        from: {
          email: config.fromEmail || "no-reply@maharshwe.shop",
          name: config.fromName || "Mahar Shwe POS",
        },
        replyTo: {
          email: config.replyTo || "maharshwemobile@gmail.com",
          name: "Mahar Shwe Mobile",
        },
        subject,
        template: "google_temp_password",
        data: safe,
        metadata: {
          source: "maharshwe-pos",
          event: "google_self_register",
          environment: process.env.NODE_ENV || "production",
        },
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      return {
        skipped: true,
        reason: data?.code || data?.message || `EMAIL_API_${response.status}`,
      };
    }

    return {
      skipped: false,
      provider: "email-agent",
      messageId: data?.messageId || null,
      status: data?.status || "queued",
    };
  } catch (error) {
    return { skipped: true, reason: safeMessage(error) };
  } finally {
    clearTimeout(timer);
  }
}

async function sendViaSmtp({ to, subject, text, html, attachments }) {
  const config = smtpConfig();
  if (!config.ready || !to) {
    console.warn("Email skipped: SMTP_HOST and SMTP_FROM are required.", { to, subject });
    return { skipped: true, reason: "SMTP_NOT_CONFIGURED" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
    const info = await transporter.sendMail({
      from: config.from,
      to,
      subject,
      text,
      html,
      attachments: attachments?.map((file) => ({
        filename: file.filename,
        content: Buffer.from(file.content, "base64"),
      })),
    });
    return { skipped: false, provider: "smtp", messageId: info.messageId || null };
  } catch (error) {
    console.error("Email send failed:", safeMessage(error));
    return { skipped: true, reason: safeMessage(error) };
  }
}

async function sendGoogleTemporaryPasswordEmail({
  to,
  name,
  shopName,
  shopSlug,
  tenantId,
  username,
  temporaryPassword,
  planLabel,
  expiryDate,
  monthlyFee,
}) {
  const loginUrl = appUrl();
  const safe = {
    name: name || username || to,
    shopName: shopName || "Your shop",
    shopSlug: shopSlug || "",
    tenantId: tenantId || "",
    email: to,
    username: username || to,
    temporaryPassword: temporaryPassword || "",
    planLabel: planLabel || process.env.POS_DEFAULT_PLAN_LABEL || "Trial",
    expiryDate: formatDate(expiryDate),
    monthlyFee,
    loginUrl,
  };
  const { subject, text, html, attachments } = buildWelcomeEmail(safe);

  const resendResult = await sendViaResend({ to, subject, text, html, attachments });
  if (!resendResult.skipped) return resendResult;

  const apiResult = await sendViaEmailAgent({ to, subject, safe });
  if (!apiResult.skipped) return apiResult;

  const smtpResult = await sendViaSmtp({ to, subject, text, html, attachments });
  if (!smtpResult.skipped) return smtpResult;

  return {
    skipped: true,
    reason: resendResult.reason || apiResult.reason || smtpResult.reason || "EMAIL_NOT_CONFIGURED",
  };
}

module.exports = {
  generateTemporaryPassword,
  sendGoogleTemporaryPasswordEmail,
};

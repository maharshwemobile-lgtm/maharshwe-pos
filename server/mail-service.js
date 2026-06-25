const nodemailer = require("nodemailer");

const DEFAULT_APP_URL = "https://app.maharshwe.shop";

function appUrl() {
  return String(process.env.APP_PUBLIC_URL || process.env.PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, "");
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
  return String(error?.message || error || "EMAIL_SEND_FAILED").replace(/[A-Za-z0-9]{4}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}/g, "[redacted]");
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
        data: {
          name: safe.name,
          loginUrl: safe.loginUrl,
          shopName: safe.shopName,
          shopSlug: safe.shopSlug,
          tenantId: safe.tenantId,
          username: safe.username,
          temporaryPassword: safe.temporaryPassword,
          loginMethodNote: "Google Login နဲ့ဝင်ရင် password change မလိုပါ။ Username/Password နဲ့ဝင်မှ ပထမဆုံး Password အသစ်ပြောင်းရပါမယ်။",
        },
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

async function sendViaSmtp({ to, subject, text, html }) {
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
    });
    return { skipped: false, provider: "smtp", messageId: info.messageId || null };
  } catch (error) {
    console.error("Email send failed:", safeMessage(error));
    return { skipped: true, reason: safeMessage(error) };
  }
}

async function sendGoogleTemporaryPasswordEmail({ to, name, shopName, shopSlug, tenantId, username, temporaryPassword }) {
  const loginUrl = appUrl();
  const subject = "Mahar Shwe POS login information";
  const safe = {
    name: name || username || to,
    shopName: shopName || "Your shop",
    shopSlug: shopSlug || "",
    tenantId: tenantId || "",
    username: username || to,
    temporaryPassword: temporaryPassword || "",
    loginUrl,
  };

  const apiResult = await sendViaEmailAgent({ to, subject, safe });
  if (!apiResult.skipped) return apiResult;

  const text = [
    `Hello ${safe.name},`,
    "",
    "Your Mahar Shwe POS shop account is ready.",
    "",
    `Login URL: ${safe.loginUrl}`,
    `Shop Name: ${safe.shopName}`,
    `Shop Slug: ${safe.shopSlug}`,
    `Tenant ID: ${safe.tenantId}`,
    `Username: ${safe.username}`,
    `Temporary Password: ${safe.temporaryPassword}`,
    "",
    "You can continue using Google Login without changing password.",
    "If you login with username/password, you must change this temporary password first.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h2>Mahar Shwe POS login information</h2>
      <p>Hello ${escapeHtml(safe.name)},</p>
      <p>Your Mahar Shwe POS shop account is ready.</p>
      <table cellpadding="6" cellspacing="0" style="border-collapse:collapse">
        <tr><td><b>Login URL</b></td><td><a href="${escapeHtml(safe.loginUrl)}">${escapeHtml(safe.loginUrl)}</a></td></tr>
        <tr><td><b>Shop Name</b></td><td>${escapeHtml(safe.shopName)}</td></tr>
        <tr><td><b>Shop Slug</b></td><td>${escapeHtml(safe.shopSlug)}</td></tr>
        <tr><td><b>Tenant ID</b></td><td>${escapeHtml(safe.tenantId)}</td></tr>
        <tr><td><b>Username</b></td><td>${escapeHtml(safe.username)}</td></tr>
        <tr><td><b>Temporary Password</b></td><td><code style="font-size:16px">${escapeHtml(safe.temporaryPassword)}</code></td></tr>
      </table>
      <p>You can continue using Google Login without changing password.</p>
      <p>If you login with username/password, you must change this temporary password first.</p>
    </div>
  `;

  return sendViaSmtp({ to, subject, text, html });
}

module.exports = {
  generateTemporaryPassword,
  sendGoogleTemporaryPasswordEmail,
};

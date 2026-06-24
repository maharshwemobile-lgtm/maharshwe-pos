const nodemailer = require("nodemailer");

const DEFAULT_APP_URL = "https://app.maharshwe.shop";

function appUrl() {
  return String(process.env.APP_PUBLIC_URL || process.env.PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, "");
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

async function sendMail({ to, subject, text, html }) {
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
    return { skipped: false, messageId: info.messageId || null };
  } catch (error) {
    console.error("Email send failed:", error);
    return { skipped: true, reason: error.message || "EMAIL_SEND_FAILED" };
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

  return sendMail({ to, subject, text, html });
}

module.exports = {
  generateTemporaryPassword,
  sendGoogleTemporaryPasswordEmail,
};

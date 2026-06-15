const cors = require("cors");
const helmet = require("helmet");

function configuredOrigins() {
  return String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsOptions() {
  const origins = configuredOrigins();
  if (!origins.length) return { origin: true, credentials: true };

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS origin is not allowed"));
    },
  };
}

function attachSecurity(app) {
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    })
  );
  app.use(cors(corsOptions()));
}

module.exports = { attachSecurity, configuredOrigins };

function indexedString(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (!keys.length || !keys.every((key, index) => key === String(index))) return null;
  const chars = keys.map((key) => value[key]);
  if (!chars.every((char) => typeof char === 'string')) return null;
  return chars.join('');
}

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;

  const recovered = indexedString(value);
  if (recovered !== null) return recovered;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, sanitize(entry)]),
  );
}

function attachProjectSettingsResponseSanitizer(app) {
  app.use('/api/project-settings', (_req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => originalJson(sanitize(body));
    next();
  });
}

module.exports = attachProjectSettingsResponseSanitizer;

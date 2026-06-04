const DEFAULT_BASE_URL = 'https://api.honcho.dev';
const DEFAULT_WORKSPACE_ID = 'maharshwe_pos';
const USER_PEER_ID = 'pos_user';
const MONITOR_PEER_ID = 'pos_ai_monitor';

const SECRET_PATTERNS = [
  /hch-v[0-9]-[A-Za-z0-9_-]+/g,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /eyJ[A-Za-z0-9._-]+/g,
  /(password|token|secret|key)=([^&\s]+)/gi
];

function cleanId(value, fallback) {
  const id = String(value || fallback || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);
  return id || fallback;
}

function truncate(value, limit = 1200) {
  const text = String(value ?? '');
  return text.length > limit ? text.slice(0, limit) + '...' : text;
}

function redact(value) {
  let text = String(value ?? '');
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, match => {
      if (/=/.test(match)) return match.replace(/=.*/, '=***');
      return '[redacted]';
    });
  }
  return text;
}

function safeObject(input, depth = 0) {
  if (depth > 3) return '[depth-limit]';
  if (input == null || typeof input === 'number' || typeof input === 'boolean') return input;
  if (typeof input === 'string') return truncate(redact(input), 1200);
  if (Array.isArray(input)) return input.slice(0, 20).map(item => safeObject(item, depth + 1));
  if (typeof input === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(input).slice(0, 40)) {
      if (/password|token|secret|key|authorization/i.test(key)) {
        out[key] = '[redacted]';
      } else {
        out[key] = safeObject(value, depth + 1);
      }
    }
    return out;
  }
  return truncate(redact(input), 1200);
}

function honchoConfig() {
  return {
    enabled: process.env.HONCHO_BUG_MONITOR_ENABLED !== 'false' && Boolean(process.env.HONCHO_API_KEY),
    hasApiKey: Boolean(process.env.HONCHO_API_KEY),
    baseUrl: (process.env.HONCHO_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    workspaceId: cleanId(process.env.HONCHO_WORKSPACE_ID || DEFAULT_WORKSPACE_ID, DEFAULT_WORKSPACE_ID)
  };
}

function sanitizeBugPayload(input = {}) {
  const now = new Date().toISOString();
  const type = truncate(redact(input.type || 'runtime-error'), 80);
  const message = truncate(redact(input.message || input.error || 'Unknown client issue'), 1200);
  return {
    id: input.id,
    type,
    severity: ['info', 'warning', 'error', 'critical'].includes(input.severity) ? input.severity : 'error',
    message,
    stack: truncate(redact(input.stack || ''), 3000),
    component: truncate(redact(input.component || input.source || ''), 160),
    action: truncate(redact(input.action || ''), 200),
    url: truncate(redact(input.url || ''), 800),
    page: truncate(redact(input.page || input.path || ''), 240),
    shopId: cleanId(input.shopId || 'main', 'main'),
    user: safeObject(input.user || null),
    metadata: safeObject(input.metadata || {}),
    browser: safeObject(input.browser || {}),
    created_at: input.created_at || input.time || now
  };
}

async function honchoFetch(path, body, method = 'POST') {
  const cfg = honchoConfig();
  if (!cfg.enabled) return { ok: false, skipped: true, message: 'Honcho API key not configured' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${cfg.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${process.env.HONCHO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    });
    const text = await response.text();
    let data = text;
    try { data = text ? JSON.parse(text) : {}; } catch (_) {}
    if (!response.ok) {
      return { ok: false, status: response.status, error: truncate(redact(text), 500) };
    }
    return { ok: true, status: response.status, data };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'Honcho request timeout' : err.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureHonchoResources(sessionId, shopId) {
  const cfg = honchoConfig();
  if (!cfg.enabled) return { ok: false, skipped: true, message: 'Honcho disabled' };

  const workspaceBody = {
    id: cfg.workspaceId,
    metadata: { app: 'Mahar Shwe POS', purpose: 'runtime-bug-monitor' },
    configuration: {
      reasoning: {
        enabled: true,
        custom_instructions: 'Analyze Mahar Shwe POS runtime/API bug events. Find repeated failures, likely affected pages, severity, and concrete developer fix steps. Do not include secrets.'
      },
      summary: { enabled: true },
      dream: { enabled: true }
    }
  };
  const workspace = await honchoFetch('/v3/workspaces', workspaceBody);
  if (!workspace.ok) return workspace;

  await honchoFetch(`/v3/workspaces/${cfg.workspaceId}/peers`, {
    id: USER_PEER_ID,
    metadata: { role: 'runtime-user', app: 'Mahar Shwe POS' },
    configuration: {}
  });
  await honchoFetch(`/v3/workspaces/${cfg.workspaceId}/peers`, {
    id: MONITOR_PEER_ID,
    metadata: { role: 'ai-bug-monitor', app: 'Mahar Shwe POS' },
    configuration: {}
  });

  return honchoFetch(`/v3/workspaces/${cfg.workspaceId}/sessions`, {
    id: sessionId,
    metadata: { shopId, purpose: 'runtime-bug-events' },
    configuration: {
      reasoning: {
        enabled: true,
        custom_instructions: 'This session contains production POS errors and API failures. Cluster similar bugs, identify likely root causes, and recommend code fixes.'
      },
      summary: { enabled: true },
      dream: { enabled: true }
    }
  });
}

function sessionIdFor(shopId, date = new Date()) {
  const day = date.toISOString().slice(0, 10).replace(/-/g, '');
  return cleanId(`runtime_bugs_${shopId}_${day}`, `runtime_bugs_main_${day}`);
}

function bugMessage(event) {
  return [
    `Mahar Shwe POS bug event`,
    `Type: ${event.type}`,
    `Severity: ${event.severity}`,
    `Shop: ${event.shopId}`,
    `Page: ${event.page || '-'}`,
    `URL: ${event.url || '-'}`,
    `Component: ${event.component || '-'}`,
    `Action: ${event.action || '-'}`,
    `Message: ${event.message}`,
    event.stack ? `Stack:\n${event.stack}` : '',
    `Browser: ${JSON.stringify(event.browser || {})}`,
    `Metadata: ${JSON.stringify(event.metadata || {})}`,
    `Time: ${event.created_at}`
  ].filter(Boolean).join('\n');
}

async function sendBugEventToHoncho(event) {
  const cfg = honchoConfig();
  if (!cfg.enabled) return { ok: false, skipped: true, message: 'Honcho API key not configured' };
  const sessionId = sessionIdFor(event.shopId);
  const ready = await ensureHonchoResources(sessionId, event.shopId);
  if (!ready.ok) return ready;
  return honchoFetch(`/v3/workspaces/${cfg.workspaceId}/sessions/${sessionId}/messages`, {
    messages: [{
      peer_id: USER_PEER_ID,
      content: bugMessage(event),
      metadata: {
        type: event.type,
        severity: event.severity,
        shopId: event.shopId,
        page: event.page,
        source: 'maharshwe-pos-client'
      },
      configuration: {
        reasoning: {
          enabled: true,
          custom_instructions: 'Treat this as a production bug signal. Look for clusters and probable root causes.'
        }
      },
      created_at: event.created_at
    }]
  });
}

async function analyzeBugEvents(events = [], query = '') {
  const cfg = honchoConfig();
  if (!cfg.enabled) return { ok: false, skipped: true, message: 'Honcho API key not configured' };
  const shopId = events[0]?.shopId || 'main';
  const sessionId = sessionIdFor(shopId);
  const ready = await ensureHonchoResources(sessionId, shopId);
  if (!ready.ok) return ready;

  const recent = events.slice(0, 30).map((event, index) => (
    `${index + 1}. [${event.severity}] ${event.type} ${event.page || ''}: ${event.message}`
  )).join('\n');
  const prompt = query || [
    'Analyze recent Mahar Shwe POS bug events.',
    'Return: 1) top repeated bugs, 2) likely root cause, 3) exact files/functions to inspect, 4) next fix priority.',
    recent ? `Recent local events:\n${recent}` : 'No local events were captured yet. Give setup verification steps.'
  ].join('\n\n');

  return honchoFetch(`/v3/workspaces/${cfg.workspaceId}/peers/${USER_PEER_ID}/chat`, {
    query: prompt,
    session_id: sessionId,
    stream: false,
    reasoning_level: 'medium'
  });
}

module.exports = {
  honchoConfig,
  sanitizeBugPayload,
  sendBugEventToHoncho,
  analyzeBugEvents,
  sessionIdFor,
  redact
};

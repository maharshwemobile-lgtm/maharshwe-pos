CREATE TABLE IF NOT EXISTS user_account_links (
  id UUID PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'GOOGLE',
  email TEXT NOT NULL,
  normalized_email TEXT NOT NULL,
  provider_key TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  linked_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shop_id, provider, normalized_email),
  UNIQUE (user_id, provider)
);

CREATE UNIQUE INDEX IF NOT EXISTS user_account_links_provider_key_unique_idx
  ON user_account_links(shop_id,provider,provider_key)
  WHERE provider_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_account_links_shop_active_idx
  ON user_account_links(shop_id,active,normalized_email);

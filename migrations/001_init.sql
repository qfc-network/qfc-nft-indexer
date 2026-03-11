CREATE TABLE IF NOT EXISTS collections (
  address       TEXT PRIMARY KEY,
  name          TEXT NOT NULL DEFAULT '',
  symbol        TEXT NOT NULL DEFAULT '',
  total_supply  INTEGER NOT NULL DEFAULT 0,
  floor_price   NUMERIC NOT NULL DEFAULT 0,
  total_volume  NUMERIC NOT NULL DEFAULT 0,
  owner_count   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nfts (
  id                  SERIAL PRIMARY KEY,
  collection_address  TEXT NOT NULL REFERENCES collections(address),
  token_id            TEXT NOT NULL,
  owner               TEXT NOT NULL,
  metadata_uri        TEXT,
  name                TEXT,
  image               TEXT,
  traits              JSONB DEFAULT '[]'::jsonb,
  rarity_score        NUMERIC,
  last_sale_price     NUMERIC,
  last_sale_at        TIMESTAMPTZ,
  UNIQUE (collection_address, token_id)
);

CREATE TABLE IF NOT EXISTS activities (
  id                  SERIAL PRIMARY KEY,
  type                TEXT NOT NULL,
  collection_address  TEXT NOT NULL,
  token_id            TEXT NOT NULL,
  from_addr           TEXT,
  to_addr             TEXT,
  price               NUMERIC,
  tx_hash             TEXT NOT NULL,
  block_number        BIGINT NOT NULL,
  timestamp           TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS offers (
  id                  SERIAL PRIMARY KEY,
  collection_address  TEXT NOT NULL,
  token_id            TEXT NOT NULL,
  offerer             TEXT NOT NULL,
  price               NUMERIC NOT NULL,
  expiry              TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'active',
  tx_hash             TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS indexer_state (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nfts_collection ON nfts(collection_address);
CREATE INDEX IF NOT EXISTS idx_nfts_owner ON nfts(owner);
CREATE INDEX IF NOT EXISTS idx_activities_collection ON activities(collection_address);
CREATE INDEX IF NOT EXISTS idx_activities_token ON activities(collection_address, token_id);
CREATE INDEX IF NOT EXISTS idx_activities_block ON activities(block_number);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_offers_token ON offers(collection_address, token_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);

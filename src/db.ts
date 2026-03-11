import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[],
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params);
}

export async function getLastIndexedBlock(): Promise<number> {
  const result = await query(
    `SELECT value FROM indexer_state WHERE key = 'last_block'`,
  );
  return result.rows.length > 0 ? parseInt(result.rows[0].value, 10) : -1;
}

export async function setLastIndexedBlock(block: number): Promise<void> {
  await query(
    `INSERT INTO indexer_state (key, value) VALUES ('last_block', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1`,
    [block.toString()],
  );
}

export async function ensureCollection(
  address: string,
  name: string,
  symbol: string,
): Promise<void> {
  await query(
    `INSERT INTO collections (address, name, symbol)
     VALUES ($1, $2, $3)
     ON CONFLICT (address) DO NOTHING`,
    [address.toLowerCase(), name, symbol],
  );
}

export async function upsertNFT(
  collectionAddress: string,
  tokenId: string,
  owner: string,
): Promise<void> {
  await query(
    `INSERT INTO nfts (collection_address, token_id, owner)
     VALUES ($1, $2, $3)
     ON CONFLICT (collection_address, token_id)
     DO UPDATE SET owner = $3`,
    [collectionAddress.toLowerCase(), tokenId, owner.toLowerCase()],
  );
}

export async function insertActivity(
  type: string,
  collectionAddress: string,
  tokenId: string,
  fromAddr: string | null,
  toAddr: string | null,
  price: string | null,
  txHash: string,
  blockNumber: number,
  timestamp: Date,
): Promise<void> {
  await query(
    `INSERT INTO activities (type, collection_address, token_id, from_addr, to_addr, price, tx_hash, block_number, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      type,
      collectionAddress.toLowerCase(),
      tokenId,
      fromAddr?.toLowerCase() ?? null,
      toAddr?.toLowerCase() ?? null,
      price,
      txHash,
      blockNumber,
      timestamp,
    ],
  );
}

export async function insertOffer(
  collectionAddress: string,
  tokenId: string,
  offerer: string,
  price: string,
  expiry: Date | null,
  txHash: string,
): Promise<void> {
  await query(
    `INSERT INTO offers (collection_address, token_id, offerer, price, expiry, status, tx_hash)
     VALUES ($1, $2, $3, $4, $5, 'active', $6)`,
    [
      collectionAddress.toLowerCase(),
      tokenId,
      offerer.toLowerCase(),
      price,
      expiry,
      txHash,
    ],
  );
}

export async function updateOfferStatus(
  collectionAddress: string,
  tokenId: string,
  offerer: string,
  status: string,
): Promise<void> {
  await query(
    `UPDATE offers SET status = $4
     WHERE collection_address = $1 AND token_id = $2 AND offerer = $3 AND status = 'active'`,
    [collectionAddress.toLowerCase(), tokenId, offerer.toLowerCase(), status],
  );
}

export async function updateNFTSale(
  collectionAddress: string,
  tokenId: string,
  price: string,
  saleAt: Date,
): Promise<void> {
  await query(
    `UPDATE nfts SET last_sale_price = $3, last_sale_at = $4
     WHERE collection_address = $1 AND token_id = $2`,
    [collectionAddress.toLowerCase(), tokenId, price, saleAt],
  );
}

export async function updateCollectionStats(
  collectionAddress: string,
): Promise<void> {
  const addr = collectionAddress.toLowerCase();

  await query(
    `UPDATE collections SET
       total_supply = (SELECT COUNT(*) FROM nfts WHERE collection_address = $1),
       owner_count = (SELECT COUNT(DISTINCT owner) FROM nfts WHERE collection_address = $1),
       floor_price = COALESCE(
         (SELECT MIN(price) FROM activities
          WHERE collection_address = $1 AND type = 'listed'),
         0
       ),
       total_volume = COALESCE(
         (SELECT SUM(price) FROM activities
          WHERE collection_address = $1 AND type = 'sold'),
         0
       )
     WHERE address = $1`,
    [addr],
  );
}

export async function closePool(): Promise<void> {
  if (pool) await pool.end();
}

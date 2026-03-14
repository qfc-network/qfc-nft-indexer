import 'dotenv/config';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import { getPool, closePool } from './db.js';
import { startIndexer } from './indexer.js';
import apiRouter from './api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.PORT || '3270', 10);
const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
const MARKETPLACE_ADDRESS = process.env.MARKETPLACE_ADDRESS || '';
const AUCTION_ADDRESS = process.env.AUCTION_ADDRESS || '';
const COLLECTION_FACTORY_ADDRESS = process.env.COLLECTION_FACTORY_ADDRESS || '';
const START_BLOCK = parseInt(process.env.START_BLOCK || '0', 10);

const app = express();
app.use(cors());
app.use(express.json());
app.use(apiRouter);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'qfc-nft-indexer' });
});

const provider = new ethers.JsonRpcProvider(RPC_URL);

// Auto-migrate on startup
const migrationPath = join(__dirname, '..', 'migrations', '001_init.sql');
try {
  const sql = readFileSync(migrationPath, 'utf-8');
  await getPool().query(sql);
  console.log('[migrate] schema ready');
} catch (err: any) {
  console.error('[migrate] failed:', err.message);
  process.exit(1);
}

const server = app.listen(PORT, () => {
  console.log(`[api] listening on port ${PORT}`);
  startIndexer(provider, {
    marketplaceAddress: MARKETPLACE_ADDRESS,
    auctionAddress: AUCTION_ADDRESS,
    collectionFactoryAddress: COLLECTION_FACTORY_ADDRESS,
    startBlock: START_BLOCK,
  });
});

async function shutdown() {
  console.log('[shutdown] closing...');
  server.close();
  await closePool();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

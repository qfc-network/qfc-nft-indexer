import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import { closePool } from './db.js';
import { startIndexer } from './indexer.js';
import apiRouter from './api.js';

const PORT = parseInt(process.env.PORT || '3280', 10);
const RPC_URL = process.env.QFC_RPC_URL || 'http://localhost:8545';
const MARKETPLACE_ADDRESS = process.env.MARKETPLACE_ADDRESS || '';
const AUCTION_ADDRESS = process.env.AUCTION_ADDRESS || '';

const app = express();
app.use(cors());
app.use(express.json());
app.use(apiRouter);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'qfc-nft-indexer' });
});

const provider = new ethers.JsonRpcProvider(RPC_URL);

const server = app.listen(PORT, () => {
  console.log(`[api] listening on port ${PORT}`);
  startIndexer(provider, MARKETPLACE_ADDRESS, AUCTION_ADDRESS);
});

async function shutdown() {
  console.log('[shutdown] closing...');
  server.close();
  await closePool();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

import { ethers } from 'ethers';
import { getLastIndexedBlock, setLastIndexedBlock } from './db.js';
import { isTransferEvent, handleTransfer } from './handlers/transfer.js';
import { isMarketplaceEvent, handleMarketplaceEvent } from './handlers/marketplace.js';
import { isAuctionEvent, handleAuctionEvent } from './handlers/auction.js';

const POLL_INTERVAL_MS = 2_000;
const BATCH_SIZE = 50;

export async function startIndexer(
  provider: ethers.JsonRpcProvider,
  marketplaceAddress: string,
  auctionAddress: string,
): Promise<void> {
  console.log('[indexer] starting block polling loop');

  let lastBlock = await getLastIndexedBlock();
  console.log(`[indexer] resuming from block ${lastBlock + 1}`);

  while (true) {
    try {
      const latestBlock = await provider.getBlockNumber();

      if (lastBlock >= latestBlock) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      const fromBlock = lastBlock + 1;
      const toBlock = Math.min(fromBlock + BATCH_SIZE - 1, latestBlock);

      await processBlockRange(provider, fromBlock, toBlock, marketplaceAddress, auctionAddress);

      lastBlock = toBlock;
      await setLastIndexedBlock(toBlock);

      if (toBlock < latestBlock) {
        console.log(`[indexer] synced to block ${toBlock} / ${latestBlock}`);
      } else {
        console.log(`[indexer] caught up at block ${toBlock}`);
      }
    } catch (err) {
      console.error('[indexer] error in polling loop:', err);
      await sleep(5_000);
    }
  }
}

async function processBlockRange(
  provider: ethers.JsonRpcProvider,
  fromBlock: number,
  toBlock: number,
  marketplaceAddress: string,
  auctionAddress: string,
): Promise<void> {
  const logs = await provider.getLogs({ fromBlock, toBlock });

  const blockTimestamps = new Map<number, Date>();

  for (const log of logs) {
    try {
      if (!blockTimestamps.has(log.blockNumber)) {
        const block = await provider.getBlock(log.blockNumber);
        blockTimestamps.set(
          log.blockNumber,
          new Date((block?.timestamp ?? 0) * 1000),
        );
      }
      const timestamp = blockTimestamps.get(log.blockNumber)!;

      if (isTransferEvent(log)) {
        await handleTransfer(log, timestamp, provider);
      } else if (isMarketplaceEvent(log, marketplaceAddress)) {
        await handleMarketplaceEvent(log, timestamp);
      } else if (isAuctionEvent(log, auctionAddress)) {
        await handleAuctionEvent(log, timestamp);
      }
    } catch (err) {
      console.error(
        `[indexer] error processing log in block ${log.blockNumber}, tx ${log.transactionHash}:`,
        err,
      );
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

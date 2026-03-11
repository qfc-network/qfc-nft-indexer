import { ethers } from 'ethers';
import {
  ensureCollection,
  upsertNFT,
  insertActivity,
  updateCollectionStats,
} from '../db.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const ERC721_TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');

export function isTransferEvent(log: ethers.Log): boolean {
  return (
    log.topics.length === 4 && log.topics[0] === ERC721_TRANSFER_TOPIC
  );
}

export async function handleTransfer(
  log: ethers.Log,
  timestamp: Date,
  provider: ethers.JsonRpcProvider,
): Promise<void> {
  const from = ethers.getAddress('0x' + log.topics[1].slice(26));
  const to = ethers.getAddress('0x' + log.topics[2].slice(26));
  const tokenId = BigInt(log.topics[3]).toString();
  const collectionAddress = log.address.toLowerCase();

  const isMint = from === ZERO_ADDRESS;

  if (isMint) {
    let name = '';
    let symbol = '';
    try {
      const contract = new ethers.Contract(
        log.address,
        ['function name() view returns (string)', 'function symbol() view returns (string)'],
        provider,
      );
      [name, symbol] = await Promise.all([contract.name(), contract.symbol()]);
    } catch {
      // Not all contracts implement name/symbol
    }
    await ensureCollection(collectionAddress, name, symbol);
  }

  await upsertNFT(collectionAddress, tokenId, to);

  await insertActivity(
    isMint ? 'mint' : 'transfer',
    collectionAddress,
    tokenId,
    from.toLowerCase(),
    to.toLowerCase(),
    null,
    log.transactionHash,
    log.blockNumber,
    timestamp,
  );

  await updateCollectionStats(collectionAddress);
}

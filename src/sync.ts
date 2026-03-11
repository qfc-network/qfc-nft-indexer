import { ethers } from 'ethers';
import { getLastIndexedBlock } from './db.js';

export async function getSyncStartBlock(
  provider: ethers.JsonRpcProvider,
): Promise<number> {
  const lastIndexed = await getLastIndexedBlock();

  if (lastIndexed >= 0) {
    console.log(`[sync] resuming from block ${lastIndexed + 1}`);
    return lastIndexed;
  }

  console.log('[sync] no checkpoint found, starting from block 0');
  return -1;
}

import { ethers } from 'ethers';
import { ensureCollection, insertActivity } from '../db.js';

// Event signature matching the real CollectionFactory contract
const COLLECTION_CREATED_TOPIC = ethers.id('CollectionCreated(address,address,string,string,uint256)');

const COLLECTION_FACTORY_ABI = [
  'event CollectionCreated(address indexed collection, address indexed creator, string name, string symbol, uint256 maxSupply)',
];

const iface = new ethers.Interface(COLLECTION_FACTORY_ABI);

export function isCollectionFactoryEvent(log: ethers.Log, factoryAddress: string): boolean {
  if (!factoryAddress) return false;
  return log.address.toLowerCase() === factoryAddress.toLowerCase();
}

export async function handleCollectionCreated(
  log: ethers.Log,
  timestamp: Date,
): Promise<void> {
  const topic = log.topics[0];

  if (topic !== COLLECTION_CREATED_TOPIC) return;

  const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
  if (!parsed) return;
  const [collection, creator, name, symbol] = parsed.args;

  await ensureCollection(collection, name, symbol);

  await insertActivity(
    'collection_created',
    collection,
    '0',
    creator,
    null,
    null,
    log.transactionHash,
    log.blockNumber,
    timestamp,
  );
}

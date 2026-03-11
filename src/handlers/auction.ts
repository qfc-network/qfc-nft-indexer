import { ethers } from 'ethers';
import {
  insertActivity,
  updateNFTSale,
  updateCollectionStats,
} from '../db.js';

const AUCTION_CREATED_TOPIC = ethers.id('AuctionCreated(address,uint256,address,uint256,uint256)');
const BID_PLACED_TOPIC = ethers.id('BidPlaced(address,uint256,address,uint256)');
const AUCTION_SETTLED_TOPIC = ethers.id('AuctionSettled(address,uint256,address,uint256)');

const AUCTION_ABI = [
  'event AuctionCreated(address indexed collection, uint256 indexed tokenId, address indexed seller, uint256 startPrice, uint256 endTime)',
  'event BidPlaced(address indexed collection, uint256 indexed tokenId, address indexed bidder, uint256 amount)',
  'event AuctionSettled(address indexed collection, uint256 indexed tokenId, address indexed winner, uint256 finalPrice)',
];

const iface = new ethers.Interface(AUCTION_ABI);

export function isAuctionEvent(log: ethers.Log, auctionAddress: string): boolean {
  return log.address.toLowerCase() === auctionAddress.toLowerCase();
}

export async function handleAuctionEvent(
  log: ethers.Log,
  timestamp: Date,
): Promise<void> {
  const topic = log.topics[0];

  if (topic === AUCTION_CREATED_TOPIC) {
    const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
    if (!parsed) return;
    const [collection, tokenId, seller, startPrice] = parsed.args;

    await insertActivity(
      'auction_created',
      collection,
      tokenId.toString(),
      seller,
      null,
      ethers.formatEther(startPrice),
      log.transactionHash,
      log.blockNumber,
      timestamp,
    );

  } else if (topic === BID_PLACED_TOPIC) {
    const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
    if (!parsed) return;
    const [collection, tokenId, bidder, amount] = parsed.args;

    await insertActivity(
      'bid_placed',
      collection,
      tokenId.toString(),
      bidder,
      null,
      ethers.formatEther(amount),
      log.transactionHash,
      log.blockNumber,
      timestamp,
    );

  } else if (topic === AUCTION_SETTLED_TOPIC) {
    const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
    if (!parsed) return;
    const [collection, tokenId, winner, finalPrice] = parsed.args;
    const priceEth = ethers.formatEther(finalPrice);

    await insertActivity(
      'auction_settled',
      collection,
      tokenId.toString(),
      null,
      winner,
      priceEth,
      log.transactionHash,
      log.blockNumber,
      timestamp,
    );
    await updateNFTSale(collection, tokenId.toString(), priceEth, timestamp);
    await updateCollectionStats(collection);
  }
}

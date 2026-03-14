import { ethers } from 'ethers';
import {
  insertActivity,
  updateNFTSale,
  updateCollectionStats,
} from '../db.js';

// Event signatures matching the real AuctionHouse contract
const AUCTION_CREATED_TOPIC = ethers.id('AuctionCreated(uint256,address,address,uint256,uint8,uint256,uint256)');
const BID_PLACED_TOPIC = ethers.id('BidPlaced(uint256,address,uint256)');
const AUCTION_EXTENDED_TOPIC = ethers.id('AuctionExtended(uint256,uint256)');
const AUCTION_SETTLED_TOPIC = ethers.id('AuctionSettled(uint256,address,uint256)');
const AUCTION_CANCELLED_TOPIC = ethers.id('AuctionCancelled(uint256)');

const AUCTION_ABI = [
  'event AuctionCreated(uint256 indexed auctionId, address indexed seller, address nftContract, uint256 tokenId, uint8 auctionType, uint256 startPrice, uint256 endTime)',
  'event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount)',
  'event AuctionExtended(uint256 indexed auctionId, uint256 newEndTime)',
  'event AuctionSettled(uint256 indexed auctionId, address indexed winner, uint256 amount)',
  'event AuctionCancelled(uint256 indexed auctionId)',
];

const iface = new ethers.Interface(AUCTION_ABI);

export function isAuctionEvent(log: ethers.Log, auctionAddress: string): boolean {
  if (!auctionAddress) return false;
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
    const [auctionId, seller, nftContract, tokenId, , startPrice] = parsed.args;

    await insertActivity(
      'auction_created',
      nftContract,
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
    const [auctionId, bidder, amount] = parsed.args;

    await insertActivity(
      'bid_placed',
      '', // nftContract not available in this event; resolved via auctionId off-chain if needed
      auctionId.toString(),
      bidder,
      null,
      ethers.formatEther(amount),
      log.transactionHash,
      log.blockNumber,
      timestamp,
    );

  } else if (topic === AUCTION_EXTENDED_TOPIC) {
    const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
    if (!parsed) return;
    const [auctionId, newEndTime] = parsed.args;

    await insertActivity(
      'auction_extended',
      '',
      auctionId.toString(),
      null,
      null,
      null,
      log.transactionHash,
      log.blockNumber,
      timestamp,
    );

  } else if (topic === AUCTION_SETTLED_TOPIC) {
    const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
    if (!parsed) return;
    const [auctionId, winner, amount] = parsed.args;
    const priceEth = ethers.formatEther(amount);

    await insertActivity(
      'auction_settled',
      '',
      auctionId.toString(),
      null,
      winner,
      priceEth,
      log.transactionHash,
      log.blockNumber,
      timestamp,
    );

  } else if (topic === AUCTION_CANCELLED_TOPIC) {
    const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
    if (!parsed) return;
    const [auctionId] = parsed.args;

    await insertActivity(
      'auction_cancelled',
      '',
      auctionId.toString(),
      null,
      null,
      null,
      log.transactionHash,
      log.blockNumber,
      timestamp,
    );
  }
}

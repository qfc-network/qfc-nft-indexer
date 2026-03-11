import { ethers } from 'ethers';
import {
  insertActivity,
  insertOffer,
  updateOfferStatus,
  updateNFTSale,
  updateCollectionStats,
} from '../db.js';

const LISTED_TOPIC = ethers.id('Listed(address,uint256,address,uint256)');
const SOLD_TOPIC = ethers.id('Sold(address,uint256,address,address,uint256)');
const CANCELLED_TOPIC = ethers.id('Cancelled(address,uint256,address)');
const OFFER_MADE_TOPIC = ethers.id('OfferMade(address,uint256,address,uint256,uint256)');
const OFFER_ACCEPTED_TOPIC = ethers.id('OfferAccepted(address,uint256,address,address,uint256)');

const MARKETPLACE_ABI = [
  'event Listed(address indexed collection, uint256 indexed tokenId, address indexed seller, uint256 price)',
  'event Sold(address indexed collection, uint256 indexed tokenId, address seller, address buyer, uint256 price)',
  'event Cancelled(address indexed collection, uint256 indexed tokenId, address indexed seller)',
  'event OfferMade(address indexed collection, uint256 indexed tokenId, address indexed offerer, uint256 price, uint256 expiry)',
  'event OfferAccepted(address indexed collection, uint256 indexed tokenId, address offerer, address seller, uint256 price)',
];

const iface = new ethers.Interface(MARKETPLACE_ABI);

export function isMarketplaceEvent(log: ethers.Log, marketplaceAddress: string): boolean {
  return log.address.toLowerCase() === marketplaceAddress.toLowerCase();
}

export async function handleMarketplaceEvent(
  log: ethers.Log,
  timestamp: Date,
): Promise<void> {
  const topic = log.topics[0];

  if (topic === LISTED_TOPIC) {
    const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
    if (!parsed) return;
    const [collection, tokenId, seller, price] = parsed.args;

    await insertActivity(
      'listed',
      collection,
      tokenId.toString(),
      seller,
      null,
      ethers.formatEther(price),
      log.transactionHash,
      log.blockNumber,
      timestamp,
    );
    await updateCollectionStats(collection);

  } else if (topic === SOLD_TOPIC) {
    const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
    if (!parsed) return;
    const [collection, tokenId, seller, buyer, price] = parsed.args;
    const priceEth = ethers.formatEther(price);

    await insertActivity(
      'sold',
      collection,
      tokenId.toString(),
      seller,
      buyer,
      priceEth,
      log.transactionHash,
      log.blockNumber,
      timestamp,
    );
    await updateNFTSale(collection, tokenId.toString(), priceEth, timestamp);
    await updateCollectionStats(collection);

  } else if (topic === CANCELLED_TOPIC) {
    const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
    if (!parsed) return;
    const [collection, tokenId, seller] = parsed.args;

    await insertActivity(
      'cancelled',
      collection,
      tokenId.toString(),
      seller,
      null,
      null,
      log.transactionHash,
      log.blockNumber,
      timestamp,
    );

  } else if (topic === OFFER_MADE_TOPIC) {
    const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
    if (!parsed) return;
    const [collection, tokenId, offerer, price, expiry] = parsed.args;

    await insertOffer(
      collection,
      tokenId.toString(),
      offerer,
      ethers.formatEther(price),
      new Date(Number(expiry) * 1000),
      log.transactionHash,
    );
    await insertActivity(
      'offer_made',
      collection,
      tokenId.toString(),
      offerer,
      null,
      ethers.formatEther(price),
      log.transactionHash,
      log.blockNumber,
      timestamp,
    );

  } else if (topic === OFFER_ACCEPTED_TOPIC) {
    const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
    if (!parsed) return;
    const [collection, tokenId, offerer, seller, price] = parsed.args;
    const priceEth = ethers.formatEther(price);

    await updateOfferStatus(collection, tokenId.toString(), offerer, 'accepted');
    await insertActivity(
      'offer_accepted',
      collection,
      tokenId.toString(),
      seller,
      offerer,
      priceEth,
      log.transactionHash,
      log.blockNumber,
      timestamp,
    );
    await updateNFTSale(collection, tokenId.toString(), priceEth, timestamp);
    await updateCollectionStats(collection);
  }
}

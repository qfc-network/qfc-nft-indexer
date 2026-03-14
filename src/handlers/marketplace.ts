import { ethers } from 'ethers';
import {
  insertActivity,
  insertOffer,
  updateOfferStatus,
  updateNFTSale,
  updateCollectionStats,
} from '../db.js';

// Event signatures matching the real QRCMarketplace contract
const NFT_LISTED_TOPIC = ethers.id('NFTListed(address,uint256,address,uint256,uint8)');
const NFT_SOLD_TOPIC = ethers.id('NFTSold(address,uint256,address,address,uint256)');
const LISTING_CANCELLED_TOPIC = ethers.id('ListingCancelled(address,uint256,address)');
const OFFER_MADE_TOPIC = ethers.id('OfferMade(address,uint256,address,uint256,uint256)');
const OFFER_ACCEPTED_TOPIC = ethers.id('OfferAccepted(address,uint256,address,address,uint256)');
const OFFER_CANCELLED_TOPIC = ethers.id('OfferCancelled(address,uint256,address)');

const MARKETPLACE_ABI = [
  'event NFTListed(address indexed nftContract, uint256 indexed tokenId, address indexed seller, uint256 price, uint8 standard)',
  'event NFTSold(address indexed nftContract, uint256 indexed tokenId, address seller, address indexed buyer, uint256 price)',
  'event ListingCancelled(address indexed nftContract, uint256 indexed tokenId, address indexed seller)',
  'event OfferMade(address indexed nftContract, uint256 indexed tokenId, address indexed offerer, uint256 amount, uint256 expiry)',
  'event OfferAccepted(address indexed nftContract, uint256 indexed tokenId, address seller, address indexed offerer, uint256 amount)',
  'event OfferCancelled(address indexed nftContract, uint256 indexed tokenId, address indexed offerer)',
];

const iface = new ethers.Interface(MARKETPLACE_ABI);

export function isMarketplaceEvent(log: ethers.Log, marketplaceAddress: string): boolean {
  if (!marketplaceAddress) return false;
  return log.address.toLowerCase() === marketplaceAddress.toLowerCase();
}

export async function handleMarketplaceEvent(
  log: ethers.Log,
  timestamp: Date,
): Promise<void> {
  const topic = log.topics[0];

  if (topic === NFT_LISTED_TOPIC) {
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

  } else if (topic === NFT_SOLD_TOPIC) {
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

  } else if (topic === LISTING_CANCELLED_TOPIC) {
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
    const [collection, tokenId, offerer, amount, expiry] = parsed.args;

    await insertOffer(
      collection,
      tokenId.toString(),
      offerer,
      ethers.formatEther(amount),
      new Date(Number(expiry) * 1000),
      log.transactionHash,
    );
    await insertActivity(
      'offer_made',
      collection,
      tokenId.toString(),
      offerer,
      null,
      ethers.formatEther(amount),
      log.transactionHash,
      log.blockNumber,
      timestamp,
    );

  } else if (topic === OFFER_ACCEPTED_TOPIC) {
    const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
    if (!parsed) return;
    const [collection, tokenId, seller, offerer, amount] = parsed.args;
    const priceEth = ethers.formatEther(amount);

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

  } else if (topic === OFFER_CANCELLED_TOPIC) {
    const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
    if (!parsed) return;
    const [collection, tokenId, offerer] = parsed.args;

    await updateOfferStatus(collection, tokenId.toString(), offerer, 'cancelled');
    await insertActivity(
      'offer_cancelled',
      collection,
      tokenId.toString(),
      offerer,
      null,
      null,
      log.transactionHash,
      log.blockNumber,
      timestamp,
    );
  }
}

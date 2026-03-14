export interface Collection {
  address: string;
  name: string;
  symbol: string;
  total_supply: number;
  floor_price: string;
  total_volume: string;
  owner_count: number;
  created_at: Date;
}

export interface NFT {
  id: number;
  collection_address: string;
  token_id: string;
  owner: string;
  metadata_uri: string | null;
  name: string | null;
  image: string | null;
  traits: Record<string, string>[];
  rarity_score: number | null;
  last_sale_price: string | null;
  last_sale_at: Date | null;
}

export interface Activity {
  id: number;
  type: ActivityType;
  collection_address: string;
  token_id: string;
  from_addr: string | null;
  to_addr: string | null;
  price: string | null;
  tx_hash: string;
  block_number: number;
  timestamp: Date;
}

export type ActivityType =
  | 'transfer'
  | 'mint'
  | 'listed'
  | 'sold'
  | 'cancelled'
  | 'offer_made'
  | 'offer_accepted'
  | 'offer_cancelled'
  | 'auction_created'
  | 'bid_placed'
  | 'auction_extended'
  | 'auction_settled'
  | 'auction_cancelled'
  | 'collection_created';

export interface Offer {
  id: number;
  collection_address: string;
  token_id: string;
  offerer: string;
  price: string;
  expiry: Date | null;
  status: 'active' | 'accepted' | 'cancelled' | 'expired';
  tx_hash: string;
}

export interface IndexerConfig {
  rpcUrl: string;
  chainId: number;
  databaseUrl: string;
  marketplaceAddress: string;
  auctionAddress: string;
  collectionFactoryAddress: string;
  startBlock: number;
  port: number;
}

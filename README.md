# QFC NFT Indexer

TypeScript service that indexes all NFT activity on the QFC chain — transfers, marketplace listings/sales, auctions — and exposes a REST API.

## Stack

- TypeScript + Express + PostgreSQL + ethers.js

## Setup

```bash
npm install
cp .env.example .env   # edit with your values
npm run migrate         # create tables
npm run dev             # start indexer + API (dev mode)
```

## API (port 3280)

| Endpoint | Description |
|----------|-------------|
| `GET /collections` | All collections + stats |
| `GET /collections/:addr` | Single collection detail |
| `GET /collections/:addr/nfts` | NFTs in collection (paginated) |
| `GET /nfts/:addr/:tokenId` | NFT detail |
| `GET /nfts/:addr/:tokenId/history` | Activity history |
| `GET /nfts/:addr/:tokenId/offers` | Active offers |
| `GET /profile/:wallet` | Owned NFTs + active listings |
| `GET /activity` | Global activity feed |
| `GET /stats` | Marketplace stats |

## Events Indexed

- **QRC-721**: `Transfer(from, to, tokenId)`
- **QRCMarketplace**: `Listed`, `Sold`, `Cancelled`, `OfferMade`, `OfferAccepted`
- **AuctionHouse**: `AuctionCreated`, `BidPlaced`, `AuctionSettled`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `QFC_RPC_URL` | QFC chain RPC endpoint |
| `MARKETPLACE_ADDRESS` | QRCMarketplace contract address |
| `AUCTION_ADDRESS` | AuctionHouse contract address |
| `PORT` | API server port (default: 3280) |

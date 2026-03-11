import { Router } from 'express';
import { query } from './db.js';

const router = Router();

// GET /collections — all collections + stats
router.get('/collections', async (_req, res) => {
  try {
    const result = await query(
      `SELECT * FROM collections ORDER BY total_volume DESC`,
    );
    res.json({ ok: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'internal error' });
  }
});

// GET /collections/:addr — single collection detail
router.get('/collections/:addr', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM collections WHERE address = $1`,
      [req.params.addr.toLowerCase()],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'collection not found' });
    }
    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'internal error' });
  }
});

// GET /collections/:addr/nfts — NFTs in collection (paginated, filterable)
router.get('/collections/:addr/nfts', async (req, res) => {
  try {
    const addr = req.params.addr.toLowerCase();
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const owner = (req.query.owner as string)?.toLowerCase();

    let sql = `SELECT * FROM nfts WHERE collection_address = $1`;
    const params: any[] = [addr];

    if (owner) {
      params.push(owner);
      sql += ` AND owner = $${params.length}`;
    }

    sql += ` ORDER BY token_id::numeric ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    const countResult = await query(
      `SELECT COUNT(*) FROM nfts WHERE collection_address = $1`,
      [addr],
    );

    res.json({
      ok: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'internal error' });
  }
});

// GET /nfts/:addr/:tokenId — NFT detail + trait rarity
router.get('/nfts/:addr/:tokenId', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM nfts WHERE collection_address = $1 AND token_id = $2`,
      [req.params.addr.toLowerCase(), req.params.tokenId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'nft not found' });
    }
    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'internal error' });
  }
});

// GET /nfts/:addr/:tokenId/history — activity history
router.get('/nfts/:addr/:tokenId/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const result = await query(
      `SELECT * FROM activities
       WHERE collection_address = $1 AND token_id = $2
       ORDER BY block_number DESC, id DESC
       LIMIT $3`,
      [req.params.addr.toLowerCase(), req.params.tokenId, limit],
    );
    res.json({ ok: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'internal error' });
  }
});

// GET /nfts/:addr/:tokenId/offers — active offers
router.get('/nfts/:addr/:tokenId/offers', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM offers
       WHERE collection_address = $1 AND token_id = $2 AND status = 'active'
       ORDER BY price DESC`,
      [req.params.addr.toLowerCase(), req.params.tokenId],
    );
    res.json({ ok: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'internal error' });
  }
});

// GET /profile/:wallet — owned NFTs + active listings
router.get('/profile/:wallet', async (req, res) => {
  try {
    const wallet = req.params.wallet.toLowerCase();

    const [nftsResult, listingsResult] = await Promise.all([
      query(
        `SELECT n.*, c.name as collection_name, c.symbol as collection_symbol
         FROM nfts n
         JOIN collections c ON c.address = n.collection_address
         WHERE n.owner = $1
         ORDER BY n.collection_address, n.token_id::numeric`,
        [wallet],
      ),
      query(
        `SELECT a.*, c.name as collection_name
         FROM activities a
         JOIN collections c ON c.address = a.collection_address
         WHERE a.from_addr = $1 AND a.type = 'listed'
         AND NOT EXISTS (
           SELECT 1 FROM activities a2
           WHERE a2.collection_address = a.collection_address
             AND a2.token_id = a.token_id
             AND a2.block_number > a.block_number
             AND a2.type IN ('sold', 'cancelled')
         )
         ORDER BY a.timestamp DESC`,
        [wallet],
      ),
    ]);

    res.json({
      ok: true,
      data: {
        owned: nftsResult.rows,
        listings: listingsResult.rows,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'internal error' });
  }
});

// GET /activity — global activity feed
router.get('/activity', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const type = req.query.type as string;

    let sql = `SELECT a.*, c.name as collection_name
               FROM activities a
               LEFT JOIN collections c ON c.address = a.collection_address`;
    const params: any[] = [];

    if (type) {
      params.push(type);
      sql += ` WHERE a.type = $1`;
    }

    sql += ` ORDER BY a.timestamp DESC, a.id DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    res.json({ ok: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'internal error' });
  }
});

// GET /stats — marketplace stats
router.get('/stats', async (_req, res) => {
  try {
    const [volumeResult, listingsResult, salesTodayResult, collectionsResult] =
      await Promise.all([
        query(`SELECT COALESCE(SUM(price), 0) as total_volume FROM activities WHERE type = 'sold'`),
        query(`SELECT COUNT(*) as active_listings FROM activities a
               WHERE a.type = 'listed'
               AND NOT EXISTS (
                 SELECT 1 FROM activities a2
                 WHERE a2.collection_address = a.collection_address
                   AND a2.token_id = a.token_id
                   AND a2.block_number > a.block_number
                   AND a2.type IN ('sold', 'cancelled')
               )`),
        query(`SELECT COUNT(*) as sales_today, COALESCE(SUM(price), 0) as volume_today
               FROM activities
               WHERE type = 'sold' AND timestamp >= CURRENT_DATE`),
        query(`SELECT COUNT(*) as total_collections FROM collections`),
      ]);

    res.json({
      ok: true,
      data: {
        total_volume: volumeResult.rows[0].total_volume,
        active_listings: parseInt(listingsResult.rows[0].active_listings),
        sales_today: parseInt(salesTodayResult.rows[0].sales_today),
        volume_today: salesTodayResult.rows[0].volume_today,
        total_collections: parseInt(collectionsResult.rows[0].total_collections),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'internal error' });
  }
});

export default router;

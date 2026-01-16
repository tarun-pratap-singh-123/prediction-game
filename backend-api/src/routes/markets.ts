import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

// GET /markets?status=ACTIVE|EXPIRED|RESOLVED
router.get('/', async (req: Request, res: Response) => {
    try {
        const { status } = req.query;
        let query = 'SELECT * FROM markets';
        const params: any[] = [];

        if (status) {
            query += ' WHERE status = $1';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching markets:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /markets/:marketId
router.get('/:marketId', async (req: Request, res: Response) => {
    try {
        const { marketId } = req.params;
        const query = 'SELECT * FROM markets WHERE id = $1';
        const result = await pool.query(query, [marketId]);

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Market not found' });
            return;
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(`Error fetching market ${req.params.marketId}:`, error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;

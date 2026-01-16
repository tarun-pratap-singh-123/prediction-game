import cron from 'node-cron';
import pool from './db';

export const startCronJobs = () => {
    const interval = process.env.CRON_INTERVAL_SECONDS || '30';
    console.log(`Starting cron jobs with interval: ${interval}s`);

    cron.schedule(`*/${interval} * * * * *`, async () => {
        console.log('Running expiration check...');
        try {
            const now = Math.floor(Date.now() / 1000);
            const query = `
        UPDATE markets
        SET status = 'EXPIRED', updated_at = NOW()
        WHERE status = 'ACTIVE' AND end_time <= $1
      `;
            const result = await pool.query(query, [now]);
            if (result.rowCount && result.rowCount > 0) {
                console.log(`Expired ${result.rowCount} markets`);
            }
        } catch (error) {
            console.error('Error in expiration cron:', error);
        }
    });
};

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export const initDb = async () => {
  console.log(pool, "poolpoolpoolpool");
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Blocks table
    await client.query(`
            CREATE TABLE IF NOT EXISTS blocks (
                number BIGINT PRIMARY KEY,
                hash TEXT NOT NULL,
                parent_hash TEXT,
                timestamp BIGINT NOT NULL
            );
        `);

    // Markets table
    await client.query(`
            CREATE TABLE IF NOT EXISTS markets (
                id BIGINT PRIMARY KEY,
                question TEXT,
                creator TEXT,
                end_time BIGINT,
                resolved BOOLEAN DEFAULT FALSE,
                outcome BOOLEAN,
                status TEXT,
                yes_volume NUMERIC DEFAULT 0,
                no_volume NUMERIC DEFAULT 0,
                total_volume NUMERIC DEFAULT 0,
                block_number BIGINT,
                block_timestamp BIGINT,
                log_index INTEGER,
                tx_hash TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

    // Bets table
    await client.query(`
            CREATE TABLE IF NOT EXISTS bets (
                id SERIAL PRIMARY KEY,
                market_id BIGINT REFERENCES markets(id),
                user_address TEXT,
                side TEXT,
                amount NUMERIC,
                tx_hash TEXT,
                block_number BIGINT,
                block_timestamp BIGINT,
                log_index INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

    // Positions table
    await client.query(`
            CREATE TABLE IF NOT EXISTS positions (
                market_id BIGINT REFERENCES markets(id),
                user_address TEXT,
                yes_amount NUMERIC DEFAULT 0,
                no_amount NUMERIC DEFAULT 0,
                claimed BOOLEAN DEFAULT FALSE,
                PRIMARY KEY (market_id, user_address)
            );
        `);

    await client.query('COMMIT');
    console.log('Database initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default pool;

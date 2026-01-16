import { ethers } from 'ethers';
import pool from './db';

export const handleMarketCreated = async (
    marketId: bigint,
    question: string,
    creator: string,
    endTime: bigint,
    event: ethers.Log,
    block: ethers.Block
) => {
    console.log(`Processing MarketCreated: ${marketId} at block ${block.number}`);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Insert block
        await client.query(`
            INSERT INTO blocks (number, hash, parent_hash, timestamp)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (number) DO NOTHING
        `, [block.number, block.hash, block.parentHash, block.timestamp]);

        const query = `
      INSERT INTO markets (
        id, question, creator, end_time, status, 
        block_number, block_timestamp, log_index, tx_hash,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `;
        await client.query(query, [
            marketId.toString(),
            question,
            creator,
            endTime.toString(),
            block.number,
            block.timestamp,
            event.index,
            event.transactionHash
        ]);

        await client.query('COMMIT');
        console.log(`Market ${marketId} created`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error handling MarketCreated for ${marketId}:`, error);
    } finally {
        client.release();
    }
};

export const handleBetPlaced = async (
    marketId: bigint,
    user: string,
    isYes: boolean,
    amount: bigint,
    event: ethers.Log,
    block: ethers.Block
) => {
    console.log(`Processing BetPlaced: ${marketId}, User: ${user}, Amount: ${amount}`);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Insert block
        await client.query(`
            INSERT INTO blocks (number, hash, parent_hash, timestamp)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (number) DO NOTHING
        `, [block.number, block.hash, block.parentHash, block.timestamp]);

        // Insert bet
        const insertBetQuery = `
      INSERT INTO bets (
        market_id, user_address, side, amount, tx_hash, 
        block_number, block_timestamp, log_index, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `;
        const side = isYes ? 'YES' : 'NO';
        await client.query(insertBetQuery, [
            marketId.toString(),
            user,
            side,
            amount.toString(),
            event.transactionHash,
            block.number,
            block.timestamp,
            event.index
        ]);

        // Update market volumes
        const updateMarketQuery = `
      UPDATE markets
      SET 
        yes_volume = yes_volume + $1,
        no_volume = no_volume + $2,
        total_volume = total_volume + $3,
        updated_at = NOW()
      WHERE id = $4
    `;
        const yesVol = isYes ? amount : 0n;
        const noVol = isYes ? 0n : amount;

        await client.query(updateMarketQuery, [
            yesVol.toString(),
            noVol.toString(),
            amount.toString(),
            marketId.toString()
        ]);

        // Update User Position
        const updatePositionQuery = `
            INSERT INTO positions (market_id, user_address, yes_amount, no_amount)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (market_id, user_address) 
            DO UPDATE SET
                yes_amount = positions.yes_amount + EXCLUDED.yes_amount,
                no_amount = positions.no_amount + EXCLUDED.no_amount
        `;
        await client.query(updatePositionQuery, [
            marketId.toString(),
            user,
            yesVol.toString(),
            noVol.toString()
        ]);

        await client.query('COMMIT');
        console.log(`Bet placed on market ${marketId}`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error handling BetPlaced for ${marketId}:`, error);
    } finally {
        client.release();
    }
};

export const handleMarketResolved = async (
    marketId: bigint,
    outcome: boolean,
    event: ethers.Log,
    block: ethers.Block
) => {
    console.log(`Processing MarketResolved: ${marketId}, Outcome: ${outcome}`);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Insert block
        await client.query(`
            INSERT INTO blocks (number, hash, parent_hash, timestamp)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (number) DO NOTHING
        `, [block.number, block.hash, block.parentHash, block.timestamp]);

        const query = `
      UPDATE markets
      SET 
        resolved = TRUE,
        outcome = $1,
        status = 'RESOLVED',
        updated_at = NOW()
      WHERE id = $2
    `;
        await client.query(query, [outcome, marketId.toString()]);

        await client.query('COMMIT');
        console.log(`Market ${marketId} resolved`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error handling MarketResolved for ${marketId}:`, error);
    } finally {
        client.release();
    }
};

export const handleWinningsClaimed = async (
    marketId: bigint,
    user: string,
    amount: bigint,
    event: ethers.Log,
    block: ethers.Block
) => {
    console.log(`Processing WinningsClaimed: ${marketId}, User: ${user}, Amount: ${amount}`);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Insert block
        await client.query(`
            INSERT INTO blocks (number, hash, parent_hash, timestamp)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (number) DO NOTHING
        `, [block.number, block.hash, block.parentHash, block.timestamp]);

        // Update position to claimed
        const query = `
            UPDATE positions
            SET claimed = TRUE
            WHERE market_id = $1 AND user_address = $2
        `;
        await client.query(query, [marketId.toString(), user]);

        await client.query('COMMIT');
        console.log(`Winnings claimed for market ${marketId} by ${user}`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error handling WinningsClaimed for ${marketId}:`, error);
    } finally {
        client.release();
    }
};

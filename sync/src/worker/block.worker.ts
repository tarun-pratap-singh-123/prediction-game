import cron from 'node-cron';
import { ethers } from 'ethers';
import redisHelper from '../helpers/redis.helper';
import { PREDICTION_MARKET_ABI } from '../abi';
import { handleMarketCreated, handleBetPlaced, handleMarketResolved, handleWinningsClaimed } from '../listener';
import pool from '../db';

const LAST_PROCESSED_BLOCK_KEY = 'LAST_PROCESSED_BLOCK';

class BlockWorker {
    private isProcessing = false;

    public startBlockWorker(provider: ethers.JsonRpcProvider, contractAddress: string) {
        const contract = new ethers.Contract(contractAddress, PREDICTION_MARKET_ABI, provider);

        cron.schedule('*/6 * * * * *', async () => {
            if (this.isProcessing) {
                console.log('Block worker is already processing, skipping...');
                return;
            }
            this.isProcessing = true;

            try {
                const latestBlock = await provider.getBlockNumber();
                let lastProcessedBlock = await redisHelper.get(LAST_PROCESSED_BLOCK_KEY);

                if (lastProcessedBlock == null) {
                    // If no last processed block, start from latest - 1 or a specific block
                    // For now, let's start from latest - 100 to catch some recent history if fresh start
                    lastProcessedBlock = (latestBlock - 1).toString();
                    await redisHelper.set(LAST_PROCESSED_BLOCK_KEY, lastProcessedBlock);
                }

                let startBlock = parseInt(lastProcessedBlock) + 1;

                // Limit batch size to avoid overwhelming
                const endBlock = Math.min(latestBlock, startBlock + 10);

                for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
                    console.log(`Processing block ${blockNumber}`);

                    const block = await provider.getBlock(blockNumber);
                    if (!block) {
                        console.warn(`Block ${blockNumber} not found, skipping...`);
                        continue;
                    }

                    // Check if block already exists in DB to avoid duplicates (idempotency)
                    // Although our handlers have ON CONFLICT DO NOTHING, it's good to be safe/efficient
                    // But we need to process events anyway.

                    // Fetch logs for this block
                    const logs = await provider.getLogs({
                        fromBlock: blockNumber,
                        toBlock: blockNumber,
                        address: contractAddress
                    });

                    for (const log of logs) {
                        try {
                            const parsedLog = contract.interface.parseLog({
                                topics: log.topics as string[],
                                data: log.data
                            });

                            if (!parsedLog) continue;

                            const event = {
                                ...log,
                                blockNumber: log.blockNumber,
                                transactionHash: log.transactionHash,
                                index: log.index
                            } as any as ethers.Log; // Cast to satisfy type, we mainly need basic props

                            switch (parsedLog.name) {
                                case 'MarketCreated':
                                    await handleMarketCreated(
                                        parsedLog.args[0], // marketId
                                        parsedLog.args[1], // question
                                        parsedLog.args[2], // creator
                                        parsedLog.args[3], // endTime
                                        event,
                                        block
                                    );
                                    break;
                                case 'BetPlaced':
                                    await handleBetPlaced(
                                        parsedLog.args[0], // marketId
                                        parsedLog.args[1], // user
                                        parsedLog.args[2], // isYes
                                        parsedLog.args[3], // amount
                                        event,
                                        block
                                    );
                                    break;
                                case 'MarketResolved':
                                    await handleMarketResolved(
                                        parsedLog.args[0], // marketId
                                        parsedLog.args[1], // outcome
                                        event,
                                        block
                                    );
                                    break;
                                case 'WinningsClaimed':
                                    await handleWinningsClaimed(
                                        parsedLog.args[0], // marketId
                                        parsedLog.args[1], // user
                                        parsedLog.args[2], // amount
                                        event,
                                        block
                                    );
                                    break;
                            }
                        } catch (err) {
                            console.error(`Error parsing log in block ${blockNumber}:`, err);
                        }
                    }

                    // Mark block as processed in Redis
                    await redisHelper.set(LAST_PROCESSED_BLOCK_KEY, blockNumber.toString());
                    console.log(`Block ${blockNumber} processed and saved`);
                }

            } catch (error) {
                console.error('Error in BlockWorker:', error);
            } finally {
                this.isProcessing = false;
            }
        });
    }
}

export default new BlockWorker();

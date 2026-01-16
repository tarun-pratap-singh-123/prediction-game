import cron from 'node-cron';
import { ethers } from 'ethers';
import redisHelper from '../helpers/redis.helper';
import { PREDICTION_MARKET_ABI } from '../abi';
import { handleMarketCreated, handleBetPlaced, handleMarketResolved, handleWinningsClaimed } from '../listener';
import pool from '../db';
import { fetchUrl } from '../helpers/common.helper';

const LAST_PROCESSED_BLOCK_KEY = 'LAST_PROCESSED_BLOCK';

class BlockWorker {
    private isProcessing = false;

    public startBlockWorker(provider: ethers.JsonRpcProvider, contractAddress: string, api: string) {
        const contract = new ethers.Contract(contractAddress, PREDICTION_MARKET_ABI, provider);

        cron.schedule('*/6 * * * * *', async () => {
            if (this.isProcessing) {
                console.log('Block worker is already processing, skipping...');
                return;
            }
            this.isProcessing = true;

            try {
                // fetch the latest block from the chain
                const responseURLURL = await fetchUrl(api + "/block_results?height=");
                const latestBlock = Number(responseURLURL?.result?.height);
                let lastProcessedBlock = await redisHelper.get(LAST_PROCESSED_BLOCK_KEY);

                if (lastProcessedBlock == null) {
                    // Start from latest - 1 if no history, or a safe default
                    lastProcessedBlock = (latestBlock - 1).toString();
                    await redisHelper.set(LAST_PROCESSED_BLOCK_KEY, lastProcessedBlock);
                }

                const startBlock = Number(lastProcessedBlock) + 1;

                // Limit batch size to avoid overwhelming (e.g. 10 blocks at a time)
                // If we are far behind, we will catch up in subsequent runs
                const endBlock = Math.min(latestBlock, startBlock + 10);

                for (let index = startBlock; index <= endBlock; index++) {

                    // Check if block already exists in DB
                    const blockExists = await pool.query('SELECT 1 FROM blocks WHERE number = $1', [index]);

                    if (blockExists.rows.length > 0) {
                        console.log("Block already present, skipping:", index);
                        // Even if present, we might want to ensure Redis is updated, 
                        // but if we are here it means we are re-processing or Redis was lost.
                        // We continue to next block but update Redis at the end of loop or here.
                        await redisHelper.set(LAST_PROCESSED_BLOCK_KEY, index.toString());
                        continue;
                    }

                    // continue processing if not found
                    console.log("🚀 Block not found, processing:", index);


                    const blockDetail = await fetchUrl(api + `/block_results?height=${index}`);
                    const blockHeaderDetail = await fetchUrl(api + `/header?height=${index}`);
                    const blockTime = blockHeaderDetail?.result?.header?.time ?? new Date().toISOString();
                    const timestamp = Math.floor(new Date(blockTime).getTime() / 1000);
                    const tx_events = blockDetail?.result?.txs_results;

                    const iface = new ethers.Interface(PREDICTION_MARKET_ABI);

                    for (let tx_event_index = 0; tx_event_index < tx_events?.length; tx_event_index++) {
                        const tx = tx_events[tx_event_index];
                        const txLog = tx?.events?.find((e: any) => e.type === "tx_log");
                        if (!txLog) continue;

                        const txLogValue = txLog.attributes.find((a: any) => a.key === "txLog")?.value;
                        if (!txLogValue) continue;

                        try {
                            const parsedLog = JSON.parse(txLogValue);
                            const topics = parsedLog.topics;
                            let data = parsedLog.data;

                            // Convert Base64 to Hex if necessary
                            if (data && !data.startsWith('0x')) {
                                data = '0x' + Buffer.from(data, 'base64').toString('hex');
                            }

                            const decodedLog = iface.parseLog({ topics, data });

                            if (decodedLog) {
                                // Construct mock Block object
                                const blockObj = {
                                    number: index,
                                    hash: blockHeaderDetail?.result?.block_id?.hash || '',
                                    parentHash: blockHeaderDetail?.result?.header?.last_block_id?.hash || '',
                                    timestamp: timestamp
                                } as any as ethers.Block;

                                // Construct mock Log object
                                const eventObj = {
                                    index: parsedLog.logIndex,
                                    transactionHash: parsedLog.transactionHash
                                } as any as ethers.Log;

                                switch (decodedLog.name) {
                                    case "MarketCreated":
                                        const { marketId, question, creator, endTime } = decodedLog.args;
                                        await handleMarketCreated(marketId, question, creator, endTime, eventObj, blockObj);
                                        break;
                                    case "BetPlaced":
                                        const { marketId: betMarketId, user, isYes, amount } = decodedLog.args;
                                        await handleBetPlaced(betMarketId, user, isYes, amount, eventObj, blockObj);
                                        break;
                                    case "MarketResolved":
                                        const { marketId: resolvedMarketId, outcome } = decodedLog.args;
                                        await handleMarketResolved(resolvedMarketId, outcome, eventObj, blockObj);
                                        break;
                                    case "WinningsClaimed":
                                        const { marketId: claimedMarketId, user: claimedUser, amount: claimedAmount } = decodedLog.args;
                                        await handleWinningsClaimed(claimedMarketId, claimedUser, claimedAmount, eventObj, blockObj);
                                        break;
                                }
                            }
                        } catch (e) {
                            console.error("Error parsing log:", e);
                        }
                    }

                    // Mark block as processed in Redis
                    await redisHelper.set(LAST_PROCESSED_BLOCK_KEY, index.toString());
                    console.log(`Block ${index} processed and saved`);
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

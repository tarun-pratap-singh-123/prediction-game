import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { initDb } from './db';
import redisHelper from './helpers/redis.helper';
import blockWorker from './worker/block.worker';

dotenv.config();

const startSync = async () => {
    console.log('Starting Sync Service...');

    // Initialize Database
    await initDb();

    // Connect to Redis
    await redisHelper.connect();

    // Connect to RPC
    const rpcUrl = String(process.env.RPC_URL);
    if (!rpcUrl) {
        console.error('RPC_URL is missing');
        process.exit(1);
    }
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Connect to Contract
    const contractAddress = String(process.env.CONTRACT_ADDRESS);
    if (!contractAddress) {
        console.error('CONTRACT_ADDRESS is missing');
        process.exit(1);
    }

    console.log(`Listening to contract at ${contractAddress}`);

    // Start Block Worker
    blockWorker.startBlockWorker(provider, contractAddress, rpcUrl);

    console.log('Sync Service is running with Block Worker...');
};

startSync().catch((error) => {
    console.error('Fatal error in Sync Service:', error);
    process.exit(1);
});

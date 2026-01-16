
import { createWalletClient, createPublicClient, http, parseUnits, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { localhost } from 'viem/chains';
import { PredictionMarketAbi } from './src/abi/PredictionMarket';
import { MockUSDCAbi } from './src/abi/MockUSDC';
import { PREDICTION_MARKET_ADDRESS, MOCK_USDC_ADDRESS } from './src/config/contracts';

// Use a known test account private key (e.g., from Anvil/Hardhat)
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const account = privateKeyToAccount(PRIVATE_KEY);

const client = createWalletClient({
    account,
    chain: localhost,
    transport: http()
});

const publicClient = createPublicClient({
    chain: localhost,
    transport: http()
});

async function main() {
    console.log(`Testing with account: ${account.address}`);

    // 1. Check Balance and Mint if needed
    const balance = await publicClient.readContract({
        address: MOCK_USDC_ADDRESS,
        abi: MockUSDCAbi,
        functionName: 'balanceOf',
        args: [account.address]
    });
    console.log(`USDC Balance: ${balance}`);

    const amountToBet = parseUnits('10', 6); // 10 USDC

    if (balance < amountToBet) {
        console.log('Minting USDC...');
        await client.writeContract({
            address: MOCK_USDC_ADDRESS,
            abi: MockUSDCAbi,
            functionName: 'mint',
            args: [account.address, amountToBet * 10n]
        });
    }

    // 2. Approve
    console.log('Approving...');
    const approveHash = await client.writeContract({
        address: MOCK_USDC_ADDRESS,
        abi: MockUSDCAbi,
        functionName: 'approve',
        args: [PREDICTION_MARKET_ADDRESS, amountToBet]
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log('Approved.');

    // 3. Buy YES
    console.log('Buying YES...');
    try {
        // Assuming market ID 1 exists. If not, we might need to create one or find one.
        // For now, let's try ID 1.
        const marketId = 1n;

        const buyHash = await client.writeContract({
            address: PREDICTION_MARKET_ADDRESS,
            abi: PredictionMarketAbi,
            functionName: 'buyYes',
            args: [marketId, amountToBet]
        });
        console.log(`Buy Transaction Hash: ${buyHash}`);

        const receipt = await publicClient.waitForTransactionReceipt({ hash: buyHash });
        console.log(`Transaction Status: ${receipt.status}`);

        if (receipt.status === 'reverted') {
            console.error('Transaction reverted!');
        } else {
            console.log('Transaction successful!');
        }

    } catch (error) {
        console.error('Error buying YES:', error);
    }
}

main();

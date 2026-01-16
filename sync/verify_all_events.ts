
import { ethers } from 'ethers';
import { PREDICTION_MARKET_ABI } from './src/abi';

const iface = new ethers.Interface(PREDICTION_MARKET_ABI);

// Mock data for different events
const events = [
    {
        name: "MarketCreated",
        args: [1, "Will it rain?", "0x1234567890123456789012345678901234567890", 1234567890],
        log: {
            topics: iface.encodeFilterTopics("MarketCreated", [1, null, "0x1234567890123456789012345678901234567890", null]),
            data: iface.encodeEventLog("MarketCreated", [1, "Will it rain?", "0x1234567890123456789012345678901234567890", 1234567890]).data
        }
    },
    {
        name: "BetPlaced",
        args: [1, "0x0987654321098765432109876543210987654321", true, 100],
        log: {
            topics: iface.encodeFilterTopics("BetPlaced", [1, "0x0987654321098765432109876543210987654321", null, null]),
            data: iface.encodeEventLog("BetPlaced", [1, "0x0987654321098765432109876543210987654321", true, 100]).data
        }
    },
    {
        name: "MarketResolved",
        args: [1, true],
        log: {
            topics: iface.encodeFilterTopics("MarketResolved", [1, null]),
            data: iface.encodeEventLog("MarketResolved", [1, true]).data
        }
    },
    {
        name: "WinningsClaimed",
        args: [1, "0x0987654321098765432109876543210987654321", 200],
        log: {
            topics: iface.encodeFilterTopics("WinningsClaimed", [1, "0x0987654321098765432109876543210987654321", null]),
            data: iface.encodeEventLog("WinningsClaimed", [1, "0x0987654321098765432109876543210987654321", 200]).data
        }
    }
];

events.forEach(event => {
    try {
        const decodedLog = iface.parseLog({ topics: event.log.topics as string[], data: event.log.data });
        if (decodedLog && decodedLog.name === event.name) {
            console.log(`Successfully decoded ${event.name}`);
            console.log("Args:", decodedLog.args);
        } else {
            console.log(`Failed to decode ${event.name}`);
        }
    } catch (error) {
        console.error(`Error decoding ${event.name}:`, error);
    }
});

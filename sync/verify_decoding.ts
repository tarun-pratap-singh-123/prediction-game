
import { ethers } from 'ethers';
import { PREDICTION_MARKET_ABI } from './src/abi';

const logData = {
    "address": "0x8285D85D40d80607a38a56c69156f637ec0Fe81D",
    "topics": [
        "0x069da8c9710c1600001ae111f110050f586b7fcd73d420b5eb03747f67e86d0d",
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000001bacaecc83ed515b77a8d39f24e46e05c8bbc920"
    ],
    "data": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAaWpniAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzV2lsbCBWaXJhdCBLb2hsaSByZWFjaCAxMDAgaW50ZXJuYXRpb25hbCBjZW50dXJpZXM/AAAAAAAAAAAAAAAAAA==",
    "blockNumber": 4187115,
    "transactionHash": "0xae694474deb2b91df845d62bf6f0f40caa326a644ae331e50e8669046a96e86f",
    "transactionIndex": 0,
    "blockHash": "0x54db36720a7bbb02ce67f0d93487749526ded895a4948f54d68e4aca3551967d",
    "logIndex": 0
};

const iface = new ethers.Interface(PREDICTION_MARKET_ABI);

try {
    const dataBuffer = Buffer.from(logData.data, 'base64');
    const dataHex = '0x' + dataBuffer.toString('hex');
    const decodedLog = iface.parseLog({ topics: logData.topics, data: dataHex });
    if (decodedLog && decodedLog.name === "MarketCreated") {
        const { marketId, question, creator, endTime } = decodedLog.args;
        console.log("Decoded Successfully:");
        console.log("Market ID:", marketId.toString());
        console.log("Question:", question);
        console.log("Creator:", creator);
        console.log("End Time:", endTime.toString());
    } else {
        console.log("Failed to decode or event name mismatch");
    }
} catch (error) {
    console.error("Error decoding:", error);
}


const { ethers } = require('ethers');

const abi = ["event MarketCreated(uint256 indexed marketId, string question, address creator, uint256 endTime)"];
const iface = new ethers.Interface(abi);
const sig = iface.getEvent("MarketCreated").topicHash;
console.log("Signature (unindexed creator):", sig);

const abi2 = ["event MarketCreated(uint256 indexed marketId, string question, address indexed creator, uint256 endTime)"];
const iface2 = new ethers.Interface(abi2);
const sig2 = iface2.getEvent("MarketCreated").topicHash;
console.log("Signature (indexed creator):", sig2);

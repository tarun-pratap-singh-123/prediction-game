export const PREDICTION_MARKET_ABI = [
    "event MarketCreated(uint256 indexed marketId, string question, address indexed creator, uint256 endTime)",
    "event BetPlaced(uint256 indexed marketId, address indexed user, bool isYes, uint256 amount)",
    "event MarketResolved(uint256 indexed marketId, bool outcome)",
    "event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)",
    "function marketCount() view returns (uint256)",
    "function markets(uint256) view returns (string question, address creator, uint256 endTime, bool resolved, bool outcome, uint256 totalYes, uint256 totalNo)"
];

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PredictionMarket
 * @dev A YES/NO prediction market with parimutuel betting
 * @notice Users can create markets, place bets, and claim winnings
 */
contract PredictionMarket is ReentrancyGuard {
    IERC20 public immutable token;
    address public admin;
    uint256 public marketCount;

    struct Market {
        string question;
        address creator;
        uint256 endTime;
        uint256 yesPool;
        uint256 noPool;
        bool resolved;
        bool outcome;
    }

    struct UserPosition {
        uint256 yesAmount;
        uint256 noAmount;
        bool claimed;
    }

    // Market ID => Market details
    mapping(uint256 => Market) public markets;
    
    // Market ID => User => Position
    mapping(uint256 => mapping(address => UserPosition)) public positions;

    // Events
    event MarketCreated(
        uint256 indexed marketId,
        string question,
        address indexed creator,
        uint256 endTime
    );
    
    event BetPlaced(
        uint256 indexed marketId,
        address indexed user,
        bool isYes,
        uint256 amount
    );
    
    event MarketResolved(
        uint256 indexed marketId,
        bool outcome
    );
    
    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount
    );

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    modifier marketExists(uint256 marketId) {
        require(marketId < marketCount, "Market does not exist");
        _;
    }

    modifier marketActive(uint256 marketId) {
        require(!markets[marketId].resolved, "Market already resolved");
        require(block.timestamp < markets[marketId].endTime, "Market has ended");
        _;
    }

    /**
     * @dev Constructor
     * @param _token Address of the ERC20 token used for betting (e.g., MockUSDC)
     */
    constructor(address _token) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
        admin = msg.sender;
    }

    /**
     * @dev Create a new prediction market
     * @param question The question or statement for the market
     * @param endTime Unix timestamp when betting ends
     */
    function createMarket(string calldata question, uint256 endTime) external returns (uint256) {
        require(bytes(question).length > 0, "Question cannot be empty");
        require(endTime > block.timestamp, "End time must be in the future");

        uint256 marketId = marketCount++;
        
        markets[marketId] = Market({
            question: question,
            creator: msg.sender,
            endTime: endTime,
            yesPool: 0,
            noPool: 0,
            resolved: false,
            outcome: false
        });

        emit MarketCreated(marketId, question, msg.sender, endTime);
        return marketId;
    }

    /**
     * @dev Place a bet on YES for a market
     * @param marketId The ID of the market
     * @param amount Amount of tokens to bet
     */
    function buyYes(uint256 marketId, uint256 amount) 
        external 
        nonReentrant 
        marketExists(marketId) 
        marketActive(marketId) 
    {
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer tokens from user to contract
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Update pool and user position
        markets[marketId].yesPool += amount;
        positions[marketId][msg.sender].yesAmount += amount;

        emit BetPlaced(marketId, msg.sender, true, amount);
    }

    /**
     * @dev Place a bet on NO for a market
     * @param marketId The ID of the market
     * @param amount Amount of tokens to bet
     */
    function buyNo(uint256 marketId, uint256 amount) 
        external 
        nonReentrant 
        marketExists(marketId) 
        marketActive(marketId) 
    {
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer tokens from user to contract
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Update pool and user position
        markets[marketId].noPool += amount;
        positions[marketId][msg.sender].noAmount += amount;

        emit BetPlaced(marketId, msg.sender, false, amount);
    }

    /**
     * @dev Resolve a market (admin only)
     * @param marketId The ID of the market
     * @param outcome True for YES, False for NO
     */
    function resolveMarket(uint256 marketId, bool outcome) 
        external 
        onlyAdmin 
        marketExists(marketId) 
    {
        Market storage market = markets[marketId];
        require(!market.resolved, "Market already resolved");
        require(block.timestamp >= market.endTime, "Market has not ended yet");

        market.resolved = true;
        market.outcome = outcome;

        emit MarketResolved(marketId, outcome);
    }

    /**
     * @dev Claim winnings from a resolved market
     * @param marketId The ID of the market
     */
    function claimWinnings(uint256 marketId) 
        external 
        nonReentrant 
        marketExists(marketId) 
    {
        Market storage market = markets[marketId];
        require(market.resolved, "Market not resolved yet");

        UserPosition storage position = positions[marketId][msg.sender];
        require(!position.claimed, "Winnings already claimed");
        
        uint256 winnings = calculateWinnings(marketId, msg.sender);
        require(winnings > 0, "No winnings to claim");

        position.claimed = true;

        // Transfer winnings to user
        require(token.transfer(msg.sender, winnings), "Transfer failed");

        emit WinningsClaimed(marketId, msg.sender, winnings);
    }

    /**
     * @dev Calculate winnings for a user in a market (parimutuel payout)
     * @param marketId The ID of the market
     * @param user The user's address
     * @return The amount of winnings
     */
    function calculateWinnings(uint256 marketId, address user) 
        public 
        view 
        marketExists(marketId) 
        returns (uint256) 
    {
        Market storage market = markets[marketId];
        if (!market.resolved) return 0;

        UserPosition storage position = positions[marketId][user];
        if (position.claimed) return 0;

        uint256 totalPool = market.yesPool + market.noPool;
        if (totalPool == 0) return 0;

        uint256 userBet;
        uint256 winningPool;

        if (market.outcome) {
            // YES won
            userBet = position.yesAmount;
            winningPool = market.yesPool;
        } else {
            // NO won
            userBet = position.noAmount;
            winningPool = market.noPool;
        }

        if (userBet == 0 || winningPool == 0) return 0;

        // Parimutuel payout: (userBet / winningPool) * totalPool
        return (userBet * totalPool) / winningPool;
    }

    /**
     * @dev Get market details
     * @param marketId The ID of the market
     * @return Market struct with all details
     */
    function getMarket(uint256 marketId) 
        external 
        view 
        marketExists(marketId) 
        returns (Market memory) 
    {
        return markets[marketId];
    }

    /**
     * @dev Get user position in a market
     * @param marketId The ID of the market
     * @param user The user's address
     * @return UserPosition struct
     */
    function getUserPosition(uint256 marketId, address user) 
        external 
        view 
        marketExists(marketId) 
        returns (UserPosition memory) 
    {
        return positions[marketId][user];
    }

    /**
     * @dev Get market odds (percentages)
     * @param marketId The ID of the market
     * @return yesPercentage The percentage of YES bets (multiplied by 100)
     * @return noPercentage The percentage of NO bets (multiplied by 100)
     */
    function getOdds(uint256 marketId) 
        external 
        view 
        marketExists(marketId) 
        returns (uint256 yesPercentage, uint256 noPercentage) 
    {
        Market storage market = markets[marketId];
        uint256 totalPool = market.yesPool + market.noPool;
        
        if (totalPool == 0) {
            return (5000, 5000); // 50/50 if no bets yet
        }

        yesPercentage = (market.yesPool * 10000) / totalPool;
        noPercentage = 10000 - yesPercentage;
    }
}

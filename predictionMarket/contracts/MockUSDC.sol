// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @dev Mock USDC token for testing the prediction market
 * Uses 6 decimals like the real USDC
 */
contract MockUSDC is ERC20 {
    uint8 private constant DECIMALS = 6;

    constructor() ERC20("Mock USDC", "mUSDC") {
        // Mint initial supply of 1 million USDC to deployer for testing
        _mint(msg.sender, 1_000_000 * 10 ** DECIMALS);
    }

    /**
     * @dev Returns 6 decimals like real USDC
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @dev Mint function for testing - allows anyone to mint tokens
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint (in base units)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @dev Convenience function to mint with decimal conversion
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint (in whole USDC)
     */
    function mintWithDecimals(address to, uint256 amount) external {
        _mint(to, amount * 10 ** DECIMALS);
    }
}

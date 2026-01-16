const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    // Deploy MockUSDC
    console.log("\nDeploying MockUSDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    const usdcAddress = await mockUSDC.getAddress();
    console.log("MockUSDC deployed to:", usdcAddress);

    // Deploy PredictionMarket
    console.log("\nDeploying PredictionMarket...");
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    const predictionMarket = await PredictionMarket.deploy(usdcAddress);
    await predictionMarket.waitForDeployment();
    const marketAddress = await predictionMarket.getAddress();
    console.log("PredictionMarket deployed to:", marketAddress);

    // Save contract addresses
    const addresses = {
        mockUSDC: usdcAddress,
        predictionMarket: marketAddress,
        network: (await ethers.provider.getNetwork()).name,
        chainId: (await ethers.provider.getNetwork()).chainId.toString(),
        deployer: deployer.address,
    };

    const addressesPath = path.join(__dirname, "../deployed-addresses.json");
    fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
    console.log("\nContract addresses saved to:", addressesPath);

    // Export ABIs to frontend
    const artifactsDir = path.join(__dirname, "../artifacts/contracts");
    const frontendAbiDir = path.join(__dirname, "../src/abi");

    // Create frontend ABI directory if it doesn't exist
    if (!fs.existsSync(frontendAbiDir)) {
        fs.mkdirSync(frontendAbiDir, { recursive: true });
    }

    // Copy MockUSDC ABI
    const mockUSDCArtifact = JSON.parse(
        fs.readFileSync(path.join(artifactsDir, "MockUSDC.sol/MockUSDC.json"), "utf8")
    );
    fs.writeFileSync(
        path.join(frontendAbiDir, "MockUSDC.json"),
        JSON.stringify(mockUSDCArtifact.abi, null, 2)
    );

    // Copy PredictionMarket ABI
    const predictionMarketArtifact = JSON.parse(
        fs.readFileSync(path.join(artifactsDir, "PredictionMarket.sol/PredictionMarket.json"), "utf8")
    );
    fs.writeFileSync(
        path.join(frontendAbiDir, "PredictionMarket.json"),
        JSON.stringify(predictionMarketArtifact.abi, null, 2)
    );

    console.log("ABIs exported to:", frontendAbiDir);

    console.log("\n✅ Deployment complete!");
    console.log("\nNext steps:");
    console.log("1. Update your .env file with these addresses:");
    console.log(`   VITE_MOCK_USDC_ADDRESS=${usdcAddress}`);
    console.log(`   VITE_PREDICTION_MARKET_ADDRESS=${marketAddress}`);
    console.log("2. Start the frontend development server");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

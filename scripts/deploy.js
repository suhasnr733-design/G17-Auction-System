// Deployment script for SimpleAuction contract
// Run with: npx hardhat run scripts/deploy.js --network <network-name>

const hre = require("hardhat");

async function main() {
  console.log("=" .repeat(50));
  console.log("DEPLOYING AUCTION SYSTEM SMART CONTRACT");
  console.log("=" .repeat(50));
  
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(`\nDeploying from address: ${deployer.address}`);
  console.log(`Account balance: ${hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);
  
  // Auction parameters
  const itemDescription = "Rare Vintage Watch - Rolex Submariner 16610";
  const durationInMinutes = 10; // 10 minutes auction
  
  console.log(`\nAuction Details:`);
  console.log(`  Item: ${itemDescription}`);
  console.log(`  Duration: ${durationInMinutes} minutes`);
  
  // Deploy contract
  console.log("\nDeploying contract...");
  const SimpleAuction = await hre.ethers.getContractFactory("SimpleAuction");
  const auction = await SimpleAuction.deploy(itemDescription, durationInMinutes);
  
  await auction.waitForDeployment();
  const contractAddress = await auction.getAddress();
  
  console.log(`\n✅ Contract deployed successfully!`);
  console.log(`  Contract Address: ${contractAddress}`);
  
  // Get contract details
  const seller = await auction.seller();
  const endTime = await auction.endTime();
  const endTimeDate = new Date(Number(endTime) * 1000);
  
  console.log(`\n📋 Contract Information:`);
  console.log(`  Seller: ${seller}`);
  console.log(`  End Time: ${endTimeDate.toLocaleString()}`);
  console.log(`  Current Block Time: ${new Date(Date.now()).toLocaleString()}`);
  
  // Verify deployment on Etherscan (if on supported network)
  console.log(`\n🔗 Verify on Etherscan:`);
  console.log(`  npx hardhat verify --network <network> ${contractAddress} "${itemDescription}" ${durationInMinutes}`);
  
  console.log("\n" + "=".repeat(50));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(50));
}

// Execute deployment with error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
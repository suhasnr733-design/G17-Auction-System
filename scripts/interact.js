// Interaction script for bidding, withdrawing, and ending auction
// Run with: npx hardhat run scripts/interact.js --network localhost

const hre = require("hardhat");

async function main() {
  // Replace with your deployed contract address
  const CONTRACT_ADDRESS = "0xYourContractAddressHere";
  
  console.log("=" .repeat(50));
  console.log("INTERACTING WITH AUCTION SYSTEM");
  console.log("=" .repeat(50));
  
  // Get signers (accounts)
  const [seller, bidder1, bidder2, bidder3] = await hre.ethers.getSigners();
  
  console.log(`\n👥 Accounts:`);
  console.log(`  Seller: ${seller.address}`);
  console.log(`  Bidder 1: ${bidder1.address}`);
  console.log(`  Bidder 2: ${bidder2.address}`);
  console.log(`  Bidder 3: ${bidder3.address}`);
  
  // Connect to contract
  const SimpleAuction = await hre.ethers.getContractFactory("SimpleAuction");
  const auction = SimpleAuction.attach(CONTRACT_ADDRESS);
  
  // Get auction details
  const itemDesc = await auction.itemDescription();
  const highestBid = await auction.highestBid();
  const highestBidder = await auction.highestBidder();
  const isActive = await auction.isActive();
  const remainingTime = await auction.getRemainingTime();
  
  console.log(`\n📦 Auction Status:`);
  console.log(`  Item: ${itemDesc}`);
  console.log(`  Current Highest Bid: ${hre.ethers.formatEther(highestBid)} ETH`);
  console.log(`  Current Highest Bidder: ${highestBidder}`);
  console.log(`  Active: ${isActive}`);
  console.log(`  Remaining Time: ${remainingTime} seconds`);
  
  // ============================================
  // BIDDING EXAMPLE
  // ============================================
  
  console.log("\n" + "-".repeat(40));
  console.log("PLACING BIDS");
  console.log("-".repeat(40));
  
  // Bidder 1 places bid of 1 ETH
  if (isActive) {
    console.log(`\n💰 Bidder 1 placing bid of 1 ETH...`);
    const tx1 = await auction.connect(bidder1).bid({ value: hre.ethers.parseEther("1") });
    await tx1.wait();
    console.log(`  ✅ Bid placed! Transaction: ${tx1.hash}`);
  }
  
  // Check current highest bid
  let currentHighestBid = await auction.highestBid();
  let currentHighestBidder = await auction.highestBidder();
  console.log(`\n📊 After Bidder 1:`);
  console.log(`  Highest Bid: ${hre.ethers.formatEther(currentHighestBid)} ETH`);
  console.log(`  Highest Bidder: ${currentHighestBidder}`);
  
  // Bidder 2 places bid of 2 ETH
  if (isActive) {
    console.log(`\n💰 Bidder 2 placing bid of 2 ETH...`);
    const tx2 = await auction.connect(bidder2).bid({ value: hre.ethers.parseEther("2") });
    await tx2.wait();
    console.log(`  ✅ Bid placed! Transaction: ${tx2.hash}`);
  }
  
  // Check current highest bid
  currentHighestBid = await auction.highestBid();
  currentHighestBidder = await auction.highestBidder();
  console.log(`\n📊 After Bidder 2:`);
  console.log(`  Highest Bid: ${hre.ethers.formatEther(currentHighestBid)} ETH`);
  console.log(`  Highest Bidder: ${currentHighestBidder}`);
  
  // ============================================
  // WITHDRAWAL EXAMPLE
  // ============================================
  
  console.log("\n" + "-".repeat(40));
  console.log("WITHDRAWING FUNDS");
  console.log("-".repeat(40));
  
  // Bidder 1 withdraws their outbid amount
  const pendingReturnBidder1 = await auction.getPendingReturn(bidder1.address);
  if (pendingReturnBidder1 > 0) {
    console.log(`\n💸 Bidder 1 withdrawing ${hre.ethers.formatEther(pendingReturnBidder1)} ETH...`);
    const tx3 = await auction.connect(bidder1).withdraw();
    await tx3.wait();
    console.log(`  ✅ Withdrawal complete! Transaction: ${tx3.hash}`);
  } else {
    console.log(`\nℹ️ Bidder 1 has no pending refund`);
  }
  
  // ============================================
  // ENDING AUCTION
  // ============================================
  
  console.log("\n" + "-".repeat(40));
  console.log("ENDING AUCTION");
  console.log("-".repeat(40));
  
  // Wait for auction to end (in production, you'd wait)
  // For demo purposes, we'll check if it's ended
  
  const auctionEnded = await auction.ended();
  const afterEndTime = await auction.getRemainingTime();
  
  if (!auctionEnded && afterEndTime === 0) {
    console.log(`\n🏁 Ending auction...`);
    const tx4 = await auction.connect(seller).endAuction();
    await tx4.wait();
    console.log(`  ✅ Auction ended! Transaction: ${tx4.hash}`);
    
    const winner = await auction.highestBidder();
    const winningBid = await auction.highestBid();
    console.log(`  🏆 Winner: ${winner}`);
    console.log(`  🏆 Winning Bid: ${hre.ethers.formatEther(winningBid)} ETH`);
  } else {
    console.log(`\n⏳ Auction still active. Remaining time: ${afterEndTime} seconds`);
    console.log(`   Run this script again after auction ends or manually call endAuction()`);
  }
  
  console.log("\n" + "=".repeat(50));
  console.log("INTERACTION COMPLETE");
  console.log("=".repeat(50));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
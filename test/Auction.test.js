const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleAuction", function () {
  let auction;
  let seller, bidder1, bidder2, bidder3;
  let itemDescription;
  let durationInMinutes;
  
  beforeEach(async function () {
    // Get signers
    [seller, bidder1, bidder2, bidder3] = await ethers.getSigners();
    
    // Auction parameters
    itemDescription = "Test Item for Auction";
    durationInMinutes = 5;
    
    // Deploy contract
    const SimpleAuction = await ethers.getContractFactory("SimpleAuction");
    auction = await SimpleAuction.deploy(itemDescription, durationInMinutes);
    await auction.waitForDeployment();
  });
  
  describe("Deployment", function () {
    it("Should set the correct seller", async function () {
      expect(await auction.seller()).to.equal(seller.address);
    });
    
    it("Should set the correct item description", async function () {
      expect(await auction.itemDescription()).to.equal(itemDescription);
    });
    
    it("Should set the correct end time", async function () {
      const endTime = await auction.endTime();
      const currentTime = Math.floor(Date.now() / 1000);
      const expectedEndTime = currentTime + (durationInMinutes * 60);
      // Allow 5 second difference due to block timing
      expect(Number(endTime)).to.be.closeTo(expectedEndTime, 5);
    });
    
    it("Should start with zero highest bid", async function () {
      expect(await auction.highestBid()).to.equal(0);
    });
    
    it("Should start with no highest bidder", async function () {
      expect(await auction.highestBidder()).to.equal("0x0000000000000000000000000000000000000000");
    });
    
    it("Should be active", async function () {
      expect(await auction.isActive()).to.equal(true);
    });
  });
  
  describe("Bidding", function () {
    it("Should accept a valid bid", async function () {
      const bidAmount = ethers.parseEther("1");
      await expect(auction.connect(bidder1).bid({ value: bidAmount }))
        .to.emit(auction, "BidPlaced")
        .withArgs(bidder1.address, bidAmount);
      
      expect(await auction.highestBid()).to.equal(bidAmount);
      expect(await auction.highestBidder()).to.equal(bidder1.address);
    });
    
    it("Should reject bid lower than current highest", async function () {
      const bid1 = ethers.parseEther("2");
      const bid2 = ethers.parseEther("1");
      
      await auction.connect(bidder1).bid({ value: bid1 });
      await expect(auction.connect(bidder2).bid({ value: bid2 }))
        .to.be.revertedWith("Bid too low - must be higher than current highest bid");
    });
    
    it("Should record pending return for outbid bidder", async function () {
      const bid1 = ethers.parseEther("1");
      const bid2 = ethers.parseEther("2");
      
      await auction.connect(bidder1).bid({ value: bid1 });
      await auction.connect(bidder2).bid({ value: bid2 });
      
      const pendingReturn = await auction.getPendingReturn(bidder1.address);
      expect(pendingReturn).to.equal(bid1);
    });
    
    it("Should reject bids after auction ends", async function () {
      // Increase time to after auction end
      const endTime = await auction.endTime();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(endTime) + 1]);
      await ethers.provider.send("evm_mine");
      
      await expect(auction.connect(bidder1).bid({ value: ethers.parseEther("1") }))
        .to.be.revertedWith("Auction already ended");
    });
  });
  
  describe("Withdrawals", function () {
    it("Should allow outbid bidder to withdraw funds", async function () {
      const bid1 = ethers.parseEther("1");
      const bid2 = ethers.parseEther("2");
      
      await auction.connect(bidder1).bid({ value: bid1 });
      await auction.connect(bidder2).bid({ value: bid2 });
      
      const balanceBefore = await ethers.provider.getBalance(bidder1.address);
      const tx = await auction.connect(bidder1).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(bidder1.address);
      
      // Balance should increase by bid1 minus gas
      expect(balanceAfter + gasUsed).to.be.closeTo(balanceBefore + bid1, ethers.parseEther("0.01"));
    });
    
    it("Should not allow withdrawal if no funds pending", async function () {
      await expect(auction.connect(bidder3).withdraw())
        .to.be.revertedWith("No funds available to withdraw");
    });
    
    it("Should emit Withdrawn event on successful withdrawal", async function () {
      const bid1 = ethers.parseEther("1");
      const bid2 = ethers.parseEther("2");
      
      await auction.connect(bidder1).bid({ value: bid1 });
      await auction.connect(bidder2).bid({ value: bid2 });
      
      await expect(auction.connect(bidder1).withdraw())
        .to.emit(auction, "Withdrawn")
        .withArgs(bidder1.address, bid1);
    });
  });
  
  describe("Ending Auction", function () {
    it("Should not allow ending before end time", async function () {
      await expect(auction.connect(seller).endAuction())
        .to.be.revertedWith("Auction not yet ended");
    });
    
    it("Should allow ending after end time", async function () {
      const bidAmount = ethers.parseEther("5");
      await auction.connect(bidder1).bid({ value: bidAmount });
      
      // Fast forward time
      const endTime = await auction.endTime();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(endTime) + 1]);
      await ethers.provider.send("evm_mine");
      
      await expect(auction.connect(seller).endAuction())
        .to.emit(auction, "AuctionEnded")
        .withArgs(bidder1.address, bidAmount);
      
      expect(await auction.ended()).to.equal(true);
    });
    
    it("Should transfer highest bid to seller after ending", async function () {
      const bidAmount = ethers.parseEther("5");
      await auction.connect(bidder1).bid({ value: bidAmount });
      
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      
      // Fast forward time
      const endTime = await auction.endTime();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(endTime) + 1]);
      await ethers.provider.send("evm_mine");
      
      const tx = await auction.connect(seller).endAuction();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      
      expect(sellerBalanceAfter + gasUsed).to.equal(sellerBalanceBefore + bidAmount);
    });
    
    it("Should not allow ending twice", async function () {
      const bidAmount = ethers.parseEther("5");
      await auction.connect(bidder1).bid({ value: bidAmount });
      
      // Fast forward time
      const endTime = await auction.endTime();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(endTime) + 1]);
      await ethers.provider.send("evm_mine");
      
      await auction.connect(seller).endAuction();
      await expect(auction.connect(seller).endAuction())
        .to.be.revertedWith("Auction already ended");
    });
  });
  
  describe("View Functions", function () {
    it("Should return correct remaining time", async function () {
      const remainingTime = await auction.getRemainingTime();
      expect(Number(remainingTime)).to.be.closeTo(durationInMinutes * 60, 5);
    });
    
    it("Should return correct pending return amount", async function () {
      const bid1 = ethers.parseEther("1");
      const bid2 = ethers.parseEther("2");
      
      await auction.connect(bidder1).bid({ value: bid1 });
      await auction.connect(bidder2).bid({ value: bid2 });
      
      const pending = await auction.getPendingReturn(bidder1.address);
      expect(pending).to.equal(bid1);
    });
    
    it("Should return correct current highest bid", async function () {
      const bidAmount = ethers.parseEther("3");
      await auction.connect(bidder1).bid({ value: bidAmount });
      expect(await auction.getCurrentHighestBid()).to.equal(bidAmount);
    });
  });
});
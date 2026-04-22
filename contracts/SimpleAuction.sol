// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SimpleAuction
 * @dev An open auction where users can bid ETH. Highest bidder wins.
 * @author 4CB23CS160 & 4CB23CS161
 * @notice This contract implements a basic English auction with refunds for outbid users
 */

contract SimpleAuction {
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    address public immutable seller;           // Seller's address (cannot be changed)
    uint256 public immutable endTime;          // Timestamp when auction ends
    string public itemDescription;             // Description of item being sold
    address public highestBidder;              // Current highest bidder
    uint256 public highestBid;                 // Current highest bid amount
    bool public ended;                         // Whether auction has ended
    
    // Mapping to track refund amounts for outbid users
    mapping(address => uint256) public pendingReturns;
    
    // ============================================
    // EVENTS (for frontend tracking)
    // ============================================
    
    event BidPlaced(address indexed bidder, uint256 amount);
    event AuctionEnded(address indexed winner, uint256 amount);
    event Withdrawn(address indexed bidder, uint256 amount);
    
    // ============================================
    // MODIFIERS (access control)
    // ============================================
    
    /// @dev Reverts if called after auction end time
    modifier onlyBeforeEnd() {
        require(block.timestamp < endTime, "Auction already ended");
        _;
    }
    
    /// @dev Reverts if called before auction end time
    modifier onlyAfterEnd() {
        require(block.timestamp >= endTime, "Auction not yet ended");
        _;
    }
    
    /// @dev Reverts if auction already ended
    modifier notEnded() {
        require(!ended, "Auction already ended");
        _;
    }
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    /**
     * @dev Creates a new auction
     * @param _itemDescription Description of the item being auctioned
     * @param _durationInMinutes Duration of auction in minutes
     */
    constructor(
        string memory _itemDescription,
        uint256 _durationInMinutes
    ) {
        seller = msg.sender;
        itemDescription = _itemDescription;
        endTime = block.timestamp + (_durationInMinutes * 1 minutes);
    }
    
    // ============================================
    // CORE FUNCTIONS
    // ============================================
    
    /**
     * @dev Place a bid on the auction
     * @notice Bid must be higher than current highest bid
     */
    function bid() external payable onlyBeforeEnd notEnded {
        // Validate bid amount
        require(msg.value > highestBid, "Bid too low - must be higher than current highest bid");
        
        // If there's an existing highest bidder, store their refund
        if (highestBid != 0) {
            pendingReturns[highestBidder] += highestBid;
        }
        
        // Update highest bidder and bid amount
        highestBidder = msg.sender;
        highestBid = msg.value;
        
        // Emit event for frontend
        emit BidPlaced(msg.sender, msg.value);
    }
    
    /**
     * @dev Withdraw a refund for an outbid bidder
     * @return success True if withdrawal was successful
     */
    function withdraw() external returns (bool) {
        uint256 amount = pendingReturns[msg.sender];
        
        require(amount > 0, "No funds available to withdraw");
        
        // Zero the amount before sending (prevents re-entrancy)
        pendingReturns[msg.sender] = 0;
        
        // Send ETH to the caller
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");
        
        emit Withdrawn(msg.sender, amount);
        return true;
    }
    
    /**
     * @dev End the auction and transfer funds to seller
     * @notice Can be called by anyone after end time
     */
    function endAuction() external onlyAfterEnd notEnded {
        ended = true;
        
        emit AuctionEnded(highestBidder, highestBid);
        
        // Transfer the highest bid to the seller
        if (highestBid > 0) {
            (bool success, ) = seller.call{value: highestBid}("");
            require(success, "Failed to transfer funds to seller");
        }
    }
    
    // ============================================
    // VIEW FUNCTIONS (read-only)
    // ============================================
    
    /**
     * @dev Get the current highest bid amount
     * @return Current highest bid in wei
     */
    function getCurrentHighestBid() external view returns (uint256) {
        return highestBid;
    }
    
    /**
     * @dev Get the current highest bidder address
     * @return Address of current highest bidder
     */
    function getCurrentHighestBidder() external view returns (address) {
        return highestBidder;
    }
    
    /**
     * @dev Check if auction is still active
     * @return true if auction is active (not ended and not past end time)
     */
    function isActive() external view returns (bool) {
        return (!ended && block.timestamp < endTime);
    }
    
    /**
     * @dev Get remaining time in auction
     * @return Remaining time in seconds (0 if ended)
     */
    function getRemainingTime() external view returns (uint256) {
        if (block.timestamp >= endTime || ended) {
            return 0;
        }
        return endTime - block.timestamp;
    }
    
    /**
     * @dev Get refund amount for a specific bidder
     * @param _bidder Address to check
     * @return Refund amount in wei
     */
    function getPendingReturn(address _bidder) external view returns (uint256) {
        return pendingReturns[_bidder];
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title StakingPool
 * @notice Users can stake on individual agents to share in their profits
 * @dev Implements profit-sharing mechanism for EvoSwarm agents
 */
contract StakingPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Stake {
        uint256 amount;
        uint256 stakedAt;
        uint256 lastClaimAt;
        uint256 rewardsAccrued;
    }

    struct AgentPool {
        bytes32 agentId;
        uint256 totalStaked;
        int256 totalProfitGenerated;
        uint256 rewardPerShare;  // Scaled by 1e18
        bool isActive;
    }

    IERC20 public stakingToken;  // Token users stake (e.g., USDC)
    
    mapping(bytes32 => AgentPool) public agentPools;
    mapping(bytes32 => mapping(address => Stake)) public stakes;
    
    bytes32[] public activeAgents;
    uint256 public totalValueLocked;
    uint256 public protocolFeePercent = 500; // 5% (basis points)

    // Events
    event Staked(
        address indexed staker,
        bytes32 indexed agentId,
        uint256 amount
    );

    event Unstaked(
        address indexed staker,
        bytes32 indexed agentId,
        uint256 amount
    );

    event RewardsClaimed(
        address indexed staker,
        bytes32 indexed agentId,
        uint256 amount
    );

    event ProfitDistributed(
        bytes32 indexed agentId,
        int256 profitAmount,
        uint256 rewardPerShare
    );

    constructor(address _stakingToken) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingToken);
    }

    /**
     * @notice Create a staking pool for an agent
     */
    function createAgentPool(bytes32 agentId) external onlyOwner {
        require(agentPools[agentId].agentId == bytes32(0), "Pool already exists");

        agentPools[agentId] = AgentPool({
            agentId: agentId,
            totalStaked: 0,
            totalProfitGenerated: 0,
            rewardPerShare: 0,
            isActive: true
        });

        activeAgents.push(agentId);
    }

    /**
     * @notice Stake tokens on an agent
     */
    function stake(bytes32 agentId, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        AgentPool storage pool = agentPools[agentId];
        require(pool.isActive, "Pool not active");

        // Transfer tokens
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        // Update stake
        Stake storage userStake = stakes[agentId][msg.sender];
        
        // Claim pending rewards first
        if (userStake.amount > 0) {
            _claimRewards(agentId, msg.sender);
        }

        userStake.amount += amount;
        userStake.stakedAt = block.timestamp;
        userStake.lastClaimAt = block.timestamp;

        pool.totalStaked += amount;
        totalValueLocked += amount;

        emit Staked(msg.sender, agentId, amount);
    }

    /**
     * @notice Unstake tokens from an agent
     */
    function unstake(bytes32 agentId, uint256 amount) external nonReentrant {
        Stake storage userStake = stakes[agentId][msg.sender];
        require(userStake.amount >= amount, "Insufficient stake");

        AgentPool storage pool = agentPools[agentId];

        // Claim rewards first
        _claimRewards(agentId, msg.sender);

        // Update stake
        userStake.amount -= amount;
        pool.totalStaked -= amount;
        totalValueLocked -= amount;

        // Transfer tokens
        stakingToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, agentId, amount);
    }

    /**
     * @notice Claim rewards for a staker
     */
    function claimRewards(bytes32 agentId) external nonReentrant {
        _claimRewards(agentId, msg.sender);
    }

    /**
     * @notice Internal reward claiming logic
     */
    function _claimRewards(bytes32 agentId, address staker) private {
        Stake storage userStake = stakes[agentId][staker];
        require(userStake.amount > 0, "No stake");

        AgentPool storage pool = agentPools[agentId];

        // Calculate rewards
        uint256 rewards = (userStake.amount * pool.rewardPerShare) / 1e18;
        
        if (rewards > 0) {
            userStake.rewardsAccrued += rewards;
            userStake.lastClaimAt = block.timestamp;

            stakingToken.safeTransfer(staker, rewards);

            emit RewardsClaimed(staker, agentId, rewards);
        }
    }

    /**
     * @notice Distribute agent profits to stakers
     * @dev Called by backend when agent realizes profit
     */
    function distributeProfits(bytes32 agentId, int256 profitAmount)
        external
        onlyOwner
    {
        require(profitAmount > 0, "Profit must be positive");
        
        AgentPool storage pool = agentPools[agentId];
        require(pool.isActive, "Pool not active");
        require(pool.totalStaked > 0, "No stakers");

        // Deduct protocol fee
        uint256 fee = (uint256(profitAmount) * protocolFeePercent) / 10000;
        uint256 rewardAmount = uint256(profitAmount) - fee;

        // Update reward per share
        pool.rewardPerShare += (rewardAmount * 1e18) / pool.totalStaked;
        pool.totalProfitGenerated += profitAmount;

        emit ProfitDistributed(agentId, profitAmount, pool.rewardPerShare);
    }

    /**
     * @notice Get staker's current stake and pending rewards
     */
    function getStakeInfo(bytes32 agentId, address staker)
        external
        view
        returns (
            uint256 stakedAmount,
            uint256 pendingRewards,
            uint256 stakedAt
        )
    {
        Stake memory userStake = stakes[agentId][staker];
        AgentPool memory pool = agentPools[agentId];

        stakedAmount = userStake.amount;
        pendingRewards = (userStake.amount * pool.rewardPerShare) / 1e18;
        stakedAt = userStake.stakedAt;
    }

    /**
     * @notice Get pool statistics
     */
    function getPoolStats(bytes32 agentId)
        external
        view
        returns (
            uint256 totalStaked,
            int256 totalProfit,
            uint256 rewardPerShare,
            bool isActive
        )
    {
        AgentPool memory pool = agentPools[agentId];
        return (
            pool.totalStaked,
            pool.totalProfitGenerated,
            pool.rewardPerShare,
            pool.isActive
        );
    }

    /**
     * @notice Update protocol fee
     */
    function setProtocolFee(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= 1000, "Fee too high"); // Max 10%
        protocolFeePercent = _feePercent;
    }

    /**
     * @notice Deactivate a pool (no new stakes)
     */
    function deactivatePool(bytes32 agentId) external onlyOwner {
        agentPools[agentId].isActive = false;
    }
}

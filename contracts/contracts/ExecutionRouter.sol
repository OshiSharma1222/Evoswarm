// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IAgentRegistry {
    function updateAgentMetrics(bytes32 agentId, int256 profitDelta, bool wasWinningTrade) external;
    function agents(bytes32 agentId) external view returns (
        bytes32 agentId_,
        address wallet,
        uint8 generation,
        uint256 createdAt,
        bool isActive,
        bytes32 dnaHash,
        int256 profitAllTime,
        uint256 tradeCount,
        uint256 lastActiveAt
    );
}

/**
 * @title ExecutionRouter
 * @notice Handles agent trade execution and logging for EvoSwarm
 * @dev Routes trades through DEX aggregators, logs all executions on-chain
 */
contract ExecutionRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IAgentRegistry public agentRegistry;

    struct Trade {
        bytes32 agentId;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        uint256 timestamp;
        bytes32 txHash;         // For linking to off-chain data
        int256 pnl;             // Realized PnL
        uint256 gasUsed;
    }

    struct AgentBalance {
        mapping(address => uint256) tokenBalances;
    }

    // State
    mapping(bytes32 => AgentBalance) private agentBalances;
    mapping(bytes32 => Trade[]) public agentTrades;
    Trade[] public allTrades;

    uint256 public totalTradesExecuted;
    int256 public totalSystemPnL;

    // Events
    event TradeExecuted(
        bytes32 indexed agentId,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        int256 pnl,
        bytes32 txHash
    );

    event FundsDeposited(
        bytes32 indexed agentId,
        address indexed token,
        uint256 amount
    );

    event FundsWithdrawn(
        bytes32 indexed agentId,
        address indexed token,
        uint256 amount
    );

    constructor(address _agentRegistry) Ownable(msg.sender) {
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    /**
     * @notice Deposit funds for an agent
     */
    function depositForAgent(
        bytes32 agentId,
        address token,
        uint256 amount
    ) external nonReentrant {
        require(amount > 0, "Amount must be > 0");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        agentBalances[agentId].tokenBalances[token] += amount;

        emit FundsDeposited(agentId, token, amount);
    }

    /**
     * @notice Execute a trade for an agent
     * @dev Called by authorized backend service
     */
    function executeTrade(
        bytes32 agentId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes32 txHash
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        // Verify agent exists and is active
        (
            ,
            ,
            ,
            ,
            bool isActive,
            ,
            ,
            ,
        ) = agentRegistry.agents(agentId);
        require(isActive, "Agent is not active");

        // Check balance
        require(
            agentBalances[agentId].tokenBalances[tokenIn] >= amountIn,
            "Insufficient balance"
        );

        // Mock execution (in production, call DEX router)
        // For now, simulate 99% execution (1% slippage)
        amountOut = (amountIn * 99) / 100;
        require(amountOut >= minAmountOut, "Slippage too high");

        // Update balances
        agentBalances[agentId].tokenBalances[tokenIn] -= amountIn;
        agentBalances[agentId].tokenBalances[tokenOut] += amountOut;

        // Calculate PnL (simplified: just the difference)
        int256 pnl = int256(amountOut) - int256(amountIn);
        bool wasWinningTrade = pnl > 0;

        // Record trade
        Trade memory trade = Trade({
            agentId: agentId,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountOut: amountOut,
            timestamp: block.timestamp,
            txHash: txHash,
            pnl: pnl,
            gasUsed: gasleft()
        });

        agentTrades[agentId].push(trade);
        allTrades.push(trade);
        totalTradesExecuted++;
        totalSystemPnL += pnl;

        // Update agent metrics in registry
        agentRegistry.updateAgentMetrics(agentId, pnl, wasWinningTrade);

        emit TradeExecuted(
            agentId,
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            pnl,
            txHash
        );

        return amountOut;
    }

    /**
     * @notice Withdraw funds from an agent's balance
     */
    function withdrawForAgent(
        bytes32 agentId,
        address token,
        uint256 amount,
        address recipient
    ) external onlyOwner nonReentrant {
        require(
            agentBalances[agentId].tokenBalances[token] >= amount,
            "Insufficient balance"
        );

        agentBalances[agentId].tokenBalances[token] -= amount;
        IERC20(token).safeTransfer(recipient, amount);

        emit FundsWithdrawn(agentId, token, amount);
    }

    /**
     * @notice Get agent's token balance
     */
    function getAgentBalance(bytes32 agentId, address token)
        external
        view
        returns (uint256)
    {
        return agentBalances[agentId].tokenBalances[token];
    }

    /**
     * @notice Get agent's trade history
     */
    function getAgentTrades(bytes32 agentId)
        external
        view
        returns (Trade[] memory)
    {
        return agentTrades[agentId];
    }

    /**
     * @notice Get total trades executed by agent
     */
    function getAgentTradeCount(bytes32 agentId)
        external
        view
        returns (uint256)
    {
        return agentTrades[agentId].length;
    }

    /**
     * @notice Update agent registry address
     */
    function setAgentRegistry(address _agentRegistry) external onlyOwner {
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    /**
     * @notice Emergency withdraw (owner only)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}

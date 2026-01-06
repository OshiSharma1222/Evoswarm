// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentRegistry
 * @notice Registry for autonomous trading agents in EvoSwarm
 * @dev Stores agent metadata, performance metrics, and DNA on-chain
 */
contract AgentRegistry is Ownable, ReentrancyGuard {
    struct Agent {
        bytes32 agentId;        // Off-chain UUID hash
        address wallet;          // Agent's execution wallet
        uint8 generation;        // Generation number
        uint256 createdAt;       // Timestamp
        bool isActive;           // Active status
        bytes32 dnaHash;         // Hash of agent's DNA (strategy params)
        int256 profitAllTime;    // Cumulative profit in wei
        uint256 tradeCount;      // Total trades executed
        uint256 lastActiveAt;    // Last execution timestamp
    }

    struct AgentMetrics {
        uint256 winRate;         // Win rate (basis points, 10000 = 100%)
        uint256 sharpeRatio;     // Sharpe ratio (scaled by 1e6)
        uint256 maxDrawdown;     // Max drawdown (basis points)
        uint256 fitnessScore;    // Overall fitness (scaled by 1e6)
    }

    // State variables
    mapping(bytes32 => Agent) public agents;
    mapping(bytes32 => AgentMetrics) public agentMetrics;
    mapping(address => bytes32) public walletToAgentId;
    bytes32[] public agentIds;

    uint256 public totalAgents;
    uint256 public activeAgents;
    uint8 public currentGeneration;

    // Events
    event AgentRegistered(
        bytes32 indexed agentId,
        address indexed wallet,
        uint8 generation,
        bytes32 dnaHash
    );

    event AgentStatusChanged(
        bytes32 indexed agentId,
        bool isActive
    );

    event AgentMetricsUpdated(
        bytes32 indexed agentId,
        int256 profitAllTime,
        uint256 tradeCount,
        uint256 fitnessScore
    );

    event AgentEliminated(
        bytes32 indexed agentId,
        uint8 generation,
        int256 finalProfit
    );

    constructor() Ownable(msg.sender) {
        currentGeneration = 1;
    }

    /**
     * @notice Register a new agent
     * @param agentId Off-chain UUID hash
     * @param wallet Agent's execution wallet
     * @param dnaHash Hash of agent's strategy DNA
     */
    function registerAgent(
        bytes32 agentId,
        address wallet,
        bytes32 dnaHash
    ) external onlyOwner {
        require(agents[agentId].agentId == bytes32(0), "Agent already exists");
        require(walletToAgentId[wallet] == bytes32(0), "Wallet already assigned");

        agents[agentId] = Agent({
            agentId: agentId,
            wallet: wallet,
            generation: currentGeneration,
            createdAt: block.timestamp,
            isActive: true,
            dnaHash: dnaHash,
            profitAllTime: 0,
            tradeCount: 0,
            lastActiveAt: block.timestamp
        });

        agentMetrics[agentId] = AgentMetrics({
            winRate: 5000, // Start at 50%
            sharpeRatio: 0,
            maxDrawdown: 0,
            fitnessScore: 0
        });

        agentIds.push(agentId);
        walletToAgentId[wallet] = agentId;
        totalAgents++;
        activeAgents++;

        emit AgentRegistered(agentId, wallet, currentGeneration, dnaHash);
    }

    /**
     * @notice Update agent performance metrics
     * @param agentId Agent identifier
     * @param profitDelta Change in profit (can be negative)
     * @param wasWinningTrade Whether the trade was profitable
     */
    function updateAgentMetrics(
        bytes32 agentId,
        int256 profitDelta,
        bool wasWinningTrade
    ) external onlyOwner {
        Agent storage agent = agents[agentId];
        require(agent.agentId != bytes32(0), "Agent does not exist");
        require(agent.isActive, "Agent is not active");

        agent.profitAllTime += profitDelta;
        agent.tradeCount++;
        agent.lastActiveAt = block.timestamp;

        // Update metrics
        AgentMetrics storage metrics = agentMetrics[agentId];
        
        // Update win rate (exponential moving average)
        uint256 newWinComponent = wasWinningTrade ? 10000 : 0;
        metrics.winRate = (metrics.winRate * 9 + newWinComponent) / 10;

        // Calculate fitness (simple: profit * win_rate)
        if (agent.profitAllTime > 0) {
            metrics.fitnessScore = uint256(agent.profitAllTime) * metrics.winRate / 10000;
        } else {
            metrics.fitnessScore = 0;
        }

        emit AgentMetricsUpdated(
            agentId,
            agent.profitAllTime,
            agent.tradeCount,
            metrics.fitnessScore
        );
    }

    /**
     * @notice Pause or resume an agent
     */
    function setAgentStatus(bytes32 agentId, bool isActive) external onlyOwner {
        Agent storage agent = agents[agentId];
        require(agent.agentId != bytes32(0), "Agent does not exist");

        if (agent.isActive != isActive) {
            agent.isActive = isActive;
            activeAgents = isActive ? activeAgents + 1 : activeAgents - 1;
            emit AgentStatusChanged(agentId, isActive);
        }
    }

    /**
     * @notice Eliminate an agent (mark as inactive, cannot be reactivated)
     */
    function eliminateAgent(bytes32 agentId) external onlyOwner {
        Agent storage agent = agents[agentId];
        require(agent.agentId != bytes32(0), "Agent does not exist");
        require(agent.isActive, "Agent already eliminated");

        agent.isActive = false;
        activeAgents--;

        emit AgentEliminated(agentId, agent.generation, agent.profitAllTime);
    }

    /**
     * @notice Start a new generation (evolution cycle)
     */
    function startNewGeneration() external onlyOwner {
        currentGeneration++;
    }

    /**
     * @notice Get agent details
     */
    function getAgent(bytes32 agentId) 
        external 
        view 
        returns (Agent memory agent, AgentMetrics memory metrics) 
    {
        return (agents[agentId], agentMetrics[agentId]);
    }

    /**
     * @notice Get all agent IDs
     */
    function getAllAgentIds() external view returns (bytes32[] memory) {
        return agentIds;
    }

    /**
     * @notice Get agent ID by wallet address
     */
    function getAgentByWallet(address wallet) external view returns (bytes32) {
        return walletToAgentId[wallet];
    }

    /**
     * @notice Get active agents count
     */
    function getActiveAgentCount() external view returns (uint256) {
        return activeAgents;
    }
}

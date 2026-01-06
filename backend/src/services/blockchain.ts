import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// Load contract ABIs
const contractsPath = path.join(__dirname, '../../../contracts/artifacts/contracts');

const AgentRegistryABI = JSON.parse(
  fs.readFileSync(path.join(contractsPath, 'AgentRegistry.sol/AgentRegistry.json'), 'utf8')
).abi;

const ExecutionRouterABI = JSON.parse(
  fs.readFileSync(path.join(contractsPath, 'ExecutionRouter.sol/ExecutionRouter.json'), 'utf8')
).abi;

const StakingPoolABI = JSON.parse(
  fs.readFileSync(path.join(contractsPath, 'StakingPool.sol/StakingPool.json'), 'utf8')
).abi;

// Contract addresses from environment
const AGENT_REGISTRY_ADDRESS = process.env.AGENT_REGISTRY_ADDRESS || '';
const EXECUTION_ROUTER_ADDRESS = process.env.EXECUTION_ROUTER_ADDRESS || '';
const STAKING_POOL_ADDRESS = process.env.STAKING_POOL_ADDRESS || '';
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';

let provider: ethers.JsonRpcProvider;
let signer: ethers.Wallet;
let agentRegistry: ethers.Contract;
let executionRouter: ethers.Contract;
let stakingPool: ethers.Contract;

export async function initBlockchain(): Promise<boolean> {
  try {
    console.log('🔗 Connecting to blockchain...');
    console.log('   RPC URL:', RPC_URL);
    
    provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Check connection
    const network = await provider.getNetwork();
    console.log('   Chain ID:', network.chainId.toString());
    
    if (!PRIVATE_KEY) {
      console.warn('⚠️  No PRIVATE_KEY set - blockchain write operations disabled');
      return false;
    }
    
    signer = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log('   Signer address:', signer.address);
    
    const balance = await provider.getBalance(signer.address);
    console.log('   Signer balance:', ethers.formatEther(balance), 'ETH');
    
    // Initialize contracts
    if (AGENT_REGISTRY_ADDRESS) {
      agentRegistry = new ethers.Contract(AGENT_REGISTRY_ADDRESS, AgentRegistryABI, signer);
      console.log('   AgentRegistry:', AGENT_REGISTRY_ADDRESS);
    }
    
    if (EXECUTION_ROUTER_ADDRESS) {
      executionRouter = new ethers.Contract(EXECUTION_ROUTER_ADDRESS, ExecutionRouterABI, signer);
      console.log('   ExecutionRouter:', EXECUTION_ROUTER_ADDRESS);
    }
    
    if (STAKING_POOL_ADDRESS) {
      stakingPool = new ethers.Contract(STAKING_POOL_ADDRESS, StakingPoolABI, signer);
      console.log('   StakingPool:', STAKING_POOL_ADDRESS);
    }
    
    console.log('✅ Blockchain connected');
    return true;
  } catch (error) {
    console.error('❌ Blockchain connection failed:', error);
    return false;
  }
}

// Agent Registry Functions
export async function registerAgentOnChain(
  agentId: string,
  generation: number,
  dnaHash: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (!agentRegistry) {
      return { success: false, error: 'AgentRegistry not initialized' };
    }
    
    const agentIdBytes = ethers.id(agentId);
    const dnaHashBytes = ethers.id(dnaHash);
    
    const tx = await agentRegistry.registerAgent(agentIdBytes, generation, dnaHashBytes);
    const receipt = await tx.wait();
    
    console.log(`📝 Agent ${agentId} registered on-chain. TX: ${receipt.hash}`);
    return { success: true, txHash: receipt.hash };
  } catch (error: any) {
    console.error('Failed to register agent on-chain:', error.message);
    return { success: false, error: error.message };
  }
}

export async function updateAgentMetricsOnChain(
  agentId: string,
  profitAllTime: number,
  tradeCount: number,
  fitnessScore: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (!agentRegistry) {
      return { success: false, error: 'AgentRegistry not initialized' };
    }
    
    const agentIdBytes = ethers.id(agentId);
    // Convert profit to wei-like units (multiply by 1e18 for precision)
    const profitWei = ethers.parseUnits(profitAllTime.toFixed(6), 6);
    const fitnessWei = ethers.parseUnits(fitnessScore.toFixed(6), 6);
    
    const tx = await agentRegistry.updateAgentMetrics(
      agentIdBytes,
      profitWei,
      tradeCount,
      fitnessWei
    );
    const receipt = await tx.wait();
    
    return { success: true, txHash: receipt.hash };
  } catch (error: any) {
    console.error('Failed to update agent metrics:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getAgentFromChain(agentId: string): Promise<any> {
  try {
    if (!agentRegistry) return null;
    
    const agentIdBytes = ethers.id(agentId);
    const agent = await agentRegistry.agents(agentIdBytes);
    
    return {
      wallet: agent.wallet,
      generation: Number(agent.generation),
      dnaHash: agent.dnaHash,
      profitAllTime: Number(ethers.formatUnits(agent.profitAllTime, 6)),
      tradeCount: Number(agent.tradeCount),
      fitnessScore: Number(ethers.formatUnits(agent.fitnessScore, 6)),
      isActive: agent.isActive,
      createdAt: Number(agent.createdAt),
    };
  } catch (error: any) {
    console.error('Failed to get agent from chain:', error.message);
    return null;
  }
}

// Execution Router Functions
export async function executeTrade(
  agentId: string,
  action: 'buy' | 'sell',
  tokenIn: string,
  tokenOut: string,
  amountIn: number
): Promise<{ success: boolean; txHash?: string; pnl?: number; error?: string }> {
  try {
    if (!executionRouter) {
      // Simulate trade if no blockchain
      const mockPnl = (Math.random() - 0.4) * amountIn * 0.1;
      return { success: true, txHash: `mock-${Date.now()}`, pnl: mockPnl };
    }
    
    const agentIdBytes = ethers.id(agentId);
    const amountWei = ethers.parseEther(amountIn.toString());
    
    const tx = await executionRouter.executeTrade(
      agentIdBytes,
      action === 'buy' ? 0 : 1, // 0 = buy, 1 = sell
      tokenIn,
      tokenOut,
      amountWei,
      0 // minAmountOut (for slippage protection)
    );
    const receipt = await tx.wait();
    
    // Parse PnL from events
    const event = receipt.logs.find((log: any) => log.fragment?.name === 'TradeExecuted');
    const pnl = event ? Number(ethers.formatEther(event.args.pnl)) : 0;
    
    return { success: true, txHash: receipt.hash, pnl };
  } catch (error: any) {
    console.error('Trade execution failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Staking Pool Functions
export async function getAgentStake(agentId: string): Promise<number> {
  try {
    if (!stakingPool) return 0;
    
    const agentIdBytes = ethers.id(agentId);
    const stake = await stakingPool.agentTotalStake(agentIdBytes);
    return Number(ethers.formatEther(stake));
  } catch (error: any) {
    console.error('Failed to get agent stake:', error.message);
    return 0;
  }
}

// Get all agents from chain
export async function getAllAgentsFromChain(): Promise<any[]> {
  try {
    if (!agentRegistry) return [];
    
    const count = await agentRegistry.getAgentCount();
    const agents = [];
    
    for (let i = 0; i < Number(count); i++) {
      const agentIdBytes = await agentRegistry.agentIds(i);
      const agent = await agentRegistry.agents(agentIdBytes);
      agents.push({
        id: agentIdBytes,
        wallet: agent.wallet,
        generation: Number(agent.generation),
        profitAllTime: Number(ethers.formatUnits(agent.profitAllTime, 6)),
        tradeCount: Number(agent.tradeCount),
        fitnessScore: Number(ethers.formatUnits(agent.fitnessScore, 6)),
        isActive: agent.isActive,
      });
    }
    
    return agents;
  } catch (error: any) {
    console.error('Failed to get agents from chain:', error.message);
    return [];
  }
}

// Get chain stats
export async function getChainStats(): Promise<{
  activeAgents: number;
  currentGeneration: number;
  totalTrades: number;
}> {
  try {
    if (!agentRegistry) {
      return { activeAgents: 0, currentGeneration: 0, totalTrades: 0 };
    }
    
    const activeAgents = await agentRegistry.activeAgents();
    const currentGeneration = await agentRegistry.currentGeneration();
    
    return {
      activeAgents: Number(activeAgents),
      currentGeneration: Number(currentGeneration),
      totalTrades: 0, // Would need to track separately
    };
  } catch (error: any) {
    console.error('Failed to get chain stats:', error.message);
    return { activeAgents: 0, currentGeneration: 0, totalTrades: 0 };
  }
}

export { provider, signer, agentRegistry, executionRouter, stakingPool };

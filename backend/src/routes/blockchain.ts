import { Request, Response, Router } from 'express';
import { ethers } from 'ethers';
import {
  agentRegistry,
  executionRouter,
  stakingPool,
  provider,
  signer,
  registerAgentOnChain,
  getAgentFromChain,
  getAllAgentsFromChain,
  getChainStats,
} from '../services/blockchain';

const router = Router();

// GET /api/blockchain/status - Get blockchain connection status
router.get('/status', async (req: Request, res: Response) => {
  try {
    if (!provider) {
      return res.json({
        connected: false,
        message: 'Blockchain not connected',
      });
    }

    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const signerAddress = signer ? await signer.getAddress() : null;
    const signerBalance = signerAddress ? await provider.getBalance(signerAddress) : 0n;

    res.json({
      connected: true,
      chainId: network.chainId.toString(),
      blockNumber,
      signer: {
        address: signerAddress,
        balance: ethers.formatEther(signerBalance),
      },
      contracts: {
        agentRegistry: process.env.AGENT_REGISTRY_ADDRESS || null,
        executionRouter: process.env.EXECUTION_ROUTER_ADDRESS || null,
        stakingPool: process.env.STAKING_POOL_ADDRESS || null,
      },
    });
  } catch (error: any) {
    console.error('Error fetching blockchain status:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/blockchain/agents - Get all agents from chain
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const agents = await getAllAgentsFromChain();
    res.json(agents);
  } catch (error: any) {
    console.error('Error fetching on-chain agents:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/blockchain/agent/:id - Get specific agent from chain
router.get('/agent/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agent = await getAgentFromChain(id);
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found on chain' });
    }
    
    res.json(agent);
  } catch (error: any) {
    console.error('Error fetching on-chain agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/blockchain/agent/register - Register agent on chain
router.post('/agent/register', async (req: Request, res: Response) => {
  try {
    const { agentId, walletAddress, dnaHash } = req.body;
    
    if (!agentId || !walletAddress || !dnaHash) {
      return res.status(400).json({ 
        error: 'Missing required fields: agentId, walletAddress, dnaHash' 
      });
    }

    const result = await registerAgentOnChain(agentId, walletAddress, dnaHash);
    
    if (result.success) {
      res.json({
        success: true,
        txHash: result.txHash,
        message: `Agent ${agentId} registered on blockchain`,
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Error registering agent on chain:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/blockchain/stats - Get on-chain statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getChainStats();
    
    // Get execution router stats if available
    let executionStats = {
      totalTradesExecuted: 0,
      totalSystemPnL: 0,
    };
    
    if (executionRouter) {
      try {
        const totalTrades = await executionRouter.totalTradesExecuted();
        const totalPnL = await executionRouter.totalSystemPnL();
        executionStats = {
          totalTradesExecuted: Number(totalTrades),
          totalSystemPnL: Number(ethers.formatUnits(totalPnL, 6)),
        };
      } catch (e) {
        // Contract functions may not exist
      }
    }

    res.json({
      ...stats,
      ...executionStats,
      blockchainEnabled: !!provider,
    });
  } catch (error: any) {
    console.error('Error fetching chain stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/blockchain/trades/:agentId - Get on-chain trades for agent
router.get('/trades/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    
    if (!executionRouter) {
      return res.json({ trades: [], message: 'ExecutionRouter not connected' });
    }

    const agentIdBytes = ethers.id(agentId);
    
    // Get trade count for this agent
    const trades = [];
    
    // Try to get trades from the agentTrades mapping
    // Note: This requires iteration since Solidity mappings can't be enumerated
    // In production, you'd want to use events or maintain an array
    
    // For now, return empty as we'd need to implement event indexing
    res.json({
      agentId,
      trades,
      message: 'Use /api/transactions for trade history (includes on-chain status)',
    });
  } catch (error: any) {
    console.error('Error fetching on-chain trades:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/blockchain/balance/:address - Get ETH balance
router.get('/balance/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    if (!provider) {
      return res.status(503).json({ error: 'Blockchain not connected' });
    }

    const balance = await provider.getBalance(address);
    
    res.json({
      address,
      balance: ethers.formatEther(balance),
      unit: 'ETH',
    });
  } catch (error: any) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/blockchain/sync-agent - Sync agent from database to blockchain
router.post('/sync-agent', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.body;
    
    if (!agentRegistry) {
      return res.status(503).json({ error: 'AgentRegistry not connected' });
    }

    // Import supabase here to avoid circular dependency
    const { supabase } = await import('../database/supabase');
    
    // Get agent from database
    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();
    
    if (error || !agent) {
      return res.status(404).json({ error: 'Agent not found in database' });
    }

    // Generate wallet address if not exists
    const walletAddress = agent.wallet_address || ethers.Wallet.createRandom().address;
    
    // Hash the DNA
    const dnaHash = ethers.id(JSON.stringify(agent.dna));

    // Register on chain
    const result = await registerAgentOnChain(agentId, walletAddress, dnaHash);
    
    if (result.success) {
      // Update database with wallet address
      await supabase
        .from('agents')
        .update({ wallet_address: walletAddress })
        .eq('id', agentId);

      res.json({
        success: true,
        txHash: result.txHash,
        agentId,
        walletAddress,
        message: 'Agent synced to blockchain',
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Error syncing agent:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

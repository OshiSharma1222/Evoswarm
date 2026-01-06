import { Request, Response, Router } from 'express';
import { ethers } from 'ethers';
import {
  stakingPool,
  provider,
  signer,
} from '../services/blockchain';

const router = Router();

// GET /api/staking/pools - Get all staking pools
router.get('/pools', async (req: Request, res: Response) => {
  try {
    if (!stakingPool) {
      return res.json({
        enabled: false,
        message: 'Staking not available - blockchain not connected',
        pools: [],
      });
    }

    const activeAgents = await stakingPool.activeAgents();
    const pools = [];

    for (let i = 0; i < activeAgents.length; i++) {
      try {
        const agentId = await stakingPool.activeAgents(i);
        const pool = await stakingPool.agentPools(agentId);
        
        pools.push({
          agentId: agentId,
          totalStaked: ethers.formatUnits(pool.totalStaked, 6),
          totalProfitGenerated: ethers.formatUnits(pool.totalProfitGenerated, 6),
          rewardPerShare: pool.rewardPerShare.toString(),
          isActive: pool.isActive,
        });
      } catch (e) {
        break; // No more pools
      }
    }

    res.json({
      enabled: true,
      totalValueLocked: pools.reduce((sum, p) => sum + parseFloat(p.totalStaked), 0),
      poolCount: pools.length,
      pools,
    });
  } catch (error: any) {
    console.error('Error fetching staking pools:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/staking/pool/:agentId - Get specific agent's staking pool
router.get('/pool/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    
    if (!stakingPool) {
      return res.status(503).json({ error: 'Staking not available' });
    }

    const agentIdBytes = ethers.id(agentId);
    const pool = await stakingPool.agentPools(agentIdBytes);
    
    res.json({
      agentId,
      totalStaked: ethers.formatUnits(pool.totalStaked, 6),
      totalProfitGenerated: ethers.formatUnits(pool.totalProfitGenerated, 6),
      rewardPerShare: pool.rewardPerShare.toString(),
      isActive: pool.isActive,
    });
  } catch (error: any) {
    console.error('Error fetching pool:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/staking/stake/:agentId/:address - Get user's stake in an agent
router.get('/stake/:agentId/:address', async (req: Request, res: Response) => {
  try {
    const { agentId, address } = req.params;
    
    if (!stakingPool) {
      return res.status(503).json({ error: 'Staking not available' });
    }

    const agentIdBytes = ethers.id(agentId);
    const stake = await stakingPool.stakes(agentIdBytes, address);
    
    res.json({
      agentId,
      stakerAddress: address,
      amount: ethers.formatUnits(stake.amount, 6),
      stakedAt: new Date(Number(stake.stakedAt) * 1000).toISOString(),
      lastClaimAt: new Date(Number(stake.lastClaimAt) * 1000).toISOString(),
      rewardsAccrued: ethers.formatUnits(stake.rewardsAccrued, 6),
    });
  } catch (error: any) {
    console.error('Error fetching stake:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/staking/create-pool - Create staking pool for an agent
router.post('/create-pool', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.body;
    
    if (!stakingPool) {
      return res.status(503).json({ error: 'Staking not available' });
    }

    const agentIdBytes = ethers.id(agentId);
    const tx = await stakingPool.createAgentPool(agentIdBytes);
    const receipt = await tx.wait();
    
    console.log(`✅ Created staking pool for agent ${agentId}. TX: ${receipt.hash}`);
    
    res.json({
      success: true,
      txHash: receipt.hash,
      agentId,
      message: 'Staking pool created successfully',
    });
  } catch (error: any) {
    console.error('Error creating pool:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/staking/tvl - Get total value locked
router.get('/tvl', async (req: Request, res: Response) => {
  try {
    if (!stakingPool) {
      return res.json({ tvl: 0, enabled: false });
    }

    const tvl = await stakingPool.totalValueLocked();
    
    res.json({
      tvl: ethers.formatUnits(tvl, 6),
      enabled: true,
    });
  } catch (error: any) {
    console.error('Error fetching TVL:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/staking/protocol-fee - Get protocol fee percentage
router.get('/protocol-fee', async (req: Request, res: Response) => {
  try {
    if (!stakingPool) {
      return res.json({ feePercent: 5, enabled: false });
    }

    const feePercent = await stakingPool.protocolFeePercent();
    
    res.json({
      feePercent: Number(feePercent) / 100, // Convert basis points to percentage
      enabled: true,
    });
  } catch (error: any) {
    console.error('Error fetching fee:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/staking/status - Overall staking status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = {
      enabled: !!stakingPool,
      contractAddress: process.env.STAKING_POOL_ADDRESS || null,
      stakingToken: process.env.USDC_ADDRESS || null,
      chainId: provider ? (await provider.getNetwork()).chainId.toString() : null,
    };

    if (stakingPool) {
      try {
        const tvl = await stakingPool.totalValueLocked();
        const feePercent = await stakingPool.protocolFeePercent();
        Object.assign(status, {
          totalValueLocked: ethers.formatUnits(tvl, 6),
          protocolFeePercent: Number(feePercent) / 100,
        });
      } catch (e) {
        // Contract might not be fully initialized
      }
    }

    res.json(status);
  } catch (error: any) {
    console.error('Error fetching staking status:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

import {
    AmadeusSDK,
    TransactionBuilder,
    generateKeypair
} from '@amadeus-protocol/sdk';

export interface AmadeusConfig {
  nodeUrl: string;
  privateKey?: string;
  network?: 'mainnet' | 'testnet';
}

export interface TransferParams {
  recipient: string;
  amount: number;
  symbol?: string;
}

export interface TxResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface AgentBalance {
  address: string;
  balance: number; // Human readable (AMA)
  balanceAtomic: string; // Atomic units
  symbol: string;
}

/**
 * Amadeus blockchain client wrapper for EvoSwarm agents
 * Handles transaction building, signing, and submission via Amadeus SDK
 */
export class AmadeusClient {
  private sdk: AmadeusSDK;
  private builder?: TransactionBuilder;
  private publicKey?: string;
  private enabled: boolean;

  constructor(config: AmadeusConfig) {
    // Initialize SDK
    this.sdk = new AmadeusSDK({
      baseUrl: config.nodeUrl,
      timeout: 30000,
    });

    this.enabled = !!config.privateKey;

    // Initialize transaction builder if private key provided
    if (config.privateKey) {
      try {
        this.builder = new TransactionBuilder(config.privateKey);
        // Derive public key for logging
        const keypair = generateKeypair();
        this.publicKey = keypair.publicKey;
        console.log('✅ Amadeus client initialized with signing capability');
      } catch (error: any) {
        console.warn('⚠️  Failed to initialize Amadeus transaction builder:', error.message);
        this.enabled = false;
      }
    } else {
      console.warn('⚠️  Amadeus client initialized in read-only mode (no private key)');
    }
  }

  /**
   * Check if client can sign and submit transactions
   */
  isEnabled(): boolean {
    return this.enabled && !!this.builder;
  }

  /**
   * Get chain stats and health
   */
  async getChainStats() {
    try {
      const [stats, tip] = await Promise.all([
        this.sdk.chain.getStats(),
        this.sdk.chain.getTip(),
      ]);

      return {
        height: tip.entry.height,
        hash: tip.entry.hash,
        timestamp: tip.entry.timestamp,
        stats,
      };
    } catch (error: any) {
      console.error('Failed to fetch chain stats:', error.message);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getBalance(address: string, symbol = 'AMA'): Promise<AgentBalance> {
    try {
      const balance = await this.sdk.wallet.getBalance(address, symbol);

      return {
        address,
        balance: balance.balance.float,
        balanceAtomic: balance.balance.flat.toString(), // Atomic string representation
        symbol,
      };
    } catch (error: any) {
      console.error(`Failed to fetch balance for ${address}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all balances for an address
   */
  async getAllBalances(address: string) {
    try {
      return await this.sdk.wallet.getAllBalances(address);
    } catch (error: any) {
      console.error(`Failed to fetch all balances for ${address}:`, error.message);
      throw error;
    }
  }

  /**
   * Transfer tokens (AMA or other)
   */
  async transfer(params: TransferParams): Promise<TxResult> {
    if (!this.builder) {
      return {
        success: false,
        error: 'Transaction builder not initialized (missing private key)',
      };
    }

    try {
      // Build and sign transaction
      const { txHash, txPacked } = this.builder.transfer({
        recipient: params.recipient,
        amount: params.amount,
        symbol: params.symbol || 'AMA',
      });

      // Submit to chain
      const result = await this.sdk.transaction.submitAndWait(txPacked);

      return {
        success: true,
        txHash,
      };
    } catch (error: any) {
      console.error('Transfer failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Build custom contract transaction
   */
  async buildContractTx(
    contract: string,
    method: string,
    args: any[]
  ): Promise<{ txHash: string; txPacked: Uint8Array } | null> {
    if (!this.builder) {
      console.warn('Cannot build transaction: no builder initialized');
      return null;
    }

    try {
      const result = this.builder.buildAndSign(contract, method, args);
      return result;
    } catch (error: any) {
      console.error('Failed to build contract tx:', error.message);
      return null;
    }
  }

  /**
   * Submit pre-built transaction
   */
  async submitTransaction(txPacked: Uint8Array): Promise<TxResult> {
    try {
      const result = await this.sdk.transaction.submitAndWait(txPacked);

      return {
        success: true,
        txHash: result.hash,
      };
    } catch (error: any) {
      console.error('Transaction submission failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(txHash: string) {
    try {
      return await this.sdk.transaction.get(txHash);
    } catch (error: any) {
      console.error(`Failed to fetch transaction ${txHash}:`, error.message);
      throw error;
    }
  }

  /**
   * Execute agent trade (simulated for now, can be replaced with real contract call)
   * This is where agents would call a DeFi contract on Amadeus
   */
  async executeTrade(agentId: string, tradeParams: any): Promise<TxResult> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: 'Chain not enabled for transactions',
      };
    }

    // For now, log the trade intent
    // In production, this would call an Amadeus DeFi contract like:
    // buildContractTx('DexRouter', 'swap', [tokenIn, tokenOut, amount, minOut])
    
    console.log(`[Amadeus] Agent ${agentId} trade:`, tradeParams);

    // Return mock success for demo
    return {
      success: true,
      txHash: 'demo_' + Date.now(),
    };
  }

  /**
   * Register agent on-chain (if you have an AgentRegistry contract on Amadeus)
   */
  async registerAgent(agentId: string, metadata: any): Promise<TxResult> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: 'Chain not enabled',
      };
    }

    // Placeholder: in production, call your AgentRegistry contract
    console.log(`[Amadeus] Register agent ${agentId}:`, metadata);

    return {
      success: true,
      txHash: 'agent_reg_' + Date.now(),
    };
  }
}

// Singleton instance
let amadeusClient: AmadeusClient | null = null;

/**
 * Initialize Amadeus client from environment variables
 */
export function initAmadeusClient(): AmadeusClient {
  if (amadeusClient) {
    return amadeusClient;
  }

  const nodeUrl = process.env.AMADEUS_NODE_URL || 'https://nodes.amadeus.bot/api';
  const privateKey = process.env.AMADEUS_PRIVATE_KEY;
  const network = (process.env.AMADEUS_NETWORK || 'mainnet') as 'mainnet' | 'testnet';

  amadeusClient = new AmadeusClient({
    nodeUrl,
    privateKey,
    network,
  });

  return amadeusClient;
}

/**
 * Get existing Amadeus client instance
 */
export function getAmadeusClient(): AmadeusClient | null {
  return amadeusClient;
}

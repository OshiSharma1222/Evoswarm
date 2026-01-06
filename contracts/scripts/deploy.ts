import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying EvoSwarm contracts to Amadeus...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy AgentRegistry
  console.log("📝 Deploying AgentRegistry...");
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy();
  await agentRegistry.waitForDeployment();
  const agentRegistryAddress = await agentRegistry.getAddress();
  console.log("✅ AgentRegistry deployed to:", agentRegistryAddress);

  // Deploy ExecutionRouter
  console.log("\n📝 Deploying ExecutionRouter...");
  const ExecutionRouter = await ethers.getContractFactory("ExecutionRouter");
  const executionRouter = await ExecutionRouter.deploy(agentRegistryAddress);
  await executionRouter.waitForDeployment();
  const executionRouterAddress = await executionRouter.getAddress();
  console.log("✅ ExecutionRouter deployed to:", executionRouterAddress);

  // Deploy StakingPool (using USDC or mock token)
  const stakingTokenAddress = process.env.STAKING_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";
  console.log("\n📝 Deploying StakingPool...");
  const StakingPool = await ethers.getContractFactory("StakingPool");
  const stakingPool = await StakingPool.deploy(stakingTokenAddress);
  await stakingPool.waitForDeployment();
  const stakingPoolAddress = await stakingPool.getAddress();
  console.log("✅ StakingPool deployed to:", stakingPoolAddress);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("AgentRegistry:   ", agentRegistryAddress);
  console.log("ExecutionRouter: ", executionRouterAddress);
  console.log("StakingPool:     ", stakingPoolAddress);
  console.log("=".repeat(60));

  console.log("\n💾 Save these addresses to backend/.env:");
  console.log(`AGENT_REGISTRY_ADDRESS=${agentRegistryAddress}`);
  console.log(`EXECUTION_ROUTER_ADDRESS=${executionRouterAddress}`);
  console.log(`STAKING_POOL_ADDRESS=${stakingPoolAddress}`);

  console.log("\n✅ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

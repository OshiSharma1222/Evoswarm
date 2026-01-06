import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import * as fs from "fs";
import { HardhatUserConfig } from "hardhat/config";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prefer contracts/.env. We intentionally do NOT fall back to backend/.env
// because backend envs may contain non-contract secrets and chain settings.
const contractsEnvPath = path.join(__dirname, ".env");
dotenv.config({ path: fs.existsSync(contractsEnvPath) ? contractsEnvPath : undefined });

function getAccountsFromEnv(): string[] {
  const raw = (process.env.PRIVATE_KEY || "").trim();
  if (!raw) return [];

  // Accept 64-hex or 0x-prefixed 64-hex
  const normalized = raw.startsWith("0x") ? raw : `0x${raw}`;
  return /^0x[0-9a-fA-F]{64}$/.test(normalized) ? [normalized] : [];
}

const accounts = getAccountsFromEnv();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
  },
};

export default config;

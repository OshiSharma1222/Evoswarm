require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

function getAccountsFromEnv() {
  const raw = (process.env.PRIVATE_KEY || "").trim();
  if (!raw) return [];

  const normalized = raw.startsWith("0x") ? raw : `0x${raw}`;
  return /^0x[0-9a-fA-F]{64}$/.test(normalized) ? [normalized] : [];
}

const accounts = getAccountsFromEnv();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
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
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: accounts,
      chainId: 11155111,
    },
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: accounts,
      chainId: 84532,
    },
  },
};

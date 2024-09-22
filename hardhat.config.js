const dotenv = require("dotenv");
dotenv.config();
require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
require("@nomicfoundation/hardhat-ethers");
require("hardhat-deploy-ethers");
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.24",
    namedAccounts: {
        deployer: {
            default: 0,
        },
        player: {
            default: 1,
        },
    },
    networks: {
        sepolia: {
            url: process.env.SEPOLIA_URL,
            accounts: [String(process.env.WALLET_ACCOUNT_PRIVATE_KEY)],
            chainId: 11155111,
            blockConfirmations: 6,
        },
    },
};

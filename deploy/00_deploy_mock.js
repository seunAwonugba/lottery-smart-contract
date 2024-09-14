const dotenv = require("dotenv");
dotenv.config();
const { network, ethers } = require("hardhat");
const { developmentChains } = require("../helper.config");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    const chainId = network.config.chainId;
    const BASE_FEE = ethers.parseEther("24");
    const GAS_PRICE_LINK = 1e9;

    const args = [BASE_FEE, GAS_PRICE_LINK];

    if (developmentChains.includes(network.name)) {
        log("Local network detected!!!, deploying mocks...");

        const deployVRFCoordinatorV2Mock = await deploy(
            "VRFCoordinatorV2Mock",
            {
                from: deployer,
                args,
                log: true,
                waitConfirmations: network.config.blockConfirmations || 1,
            }
        );
        console.log("Mocks deployed................");
    }

    // if (
    //     !developmentChains.includes(network.name) &&
    //     process.env.ETHERSCAN_API_KEY
    // ) {
    //     await verifyFundMe(deployFundMe.address, [ethUsdPriceFeedAddress]);
    // }
};

module.exports.tags = ["all", "mocks"];

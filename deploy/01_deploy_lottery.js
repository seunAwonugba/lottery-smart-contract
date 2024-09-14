const { network } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper.config");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    let vRFCoordinatorV2MockAddress;
    if (developmentChains.includes(network.name)) {
        const VRFCoordinatorV2Mock = await deployments.get(
            "VRFCoordinatorV2Mock"
        );
        vRFCoordinatorV2MockAddress = VRFCoordinatorV2Mock.address;
    } else {
        vRFCoordinatorV2MockAddress =
            networkConfig[chainId].vrfCoordinatorAddress;
    }
    await deploy("Lottery", {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });
};
module.exports.tags = ["Lottery"];

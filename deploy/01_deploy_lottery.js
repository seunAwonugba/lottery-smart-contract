const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper.config");
const { verifyLottery } = require("../utils/verify");

const vrfFundAmount = ethers.parseEther("30");
module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    let vRFCoordinatorV2Address;
    let subscriptionId;
    let mockContract;
    if (developmentChains.includes(network.name)) {
        const signer = await ethers.getSigner(deployer);
        //deploy the mock contract
        const vRFCoordinatorV2Mock = await deployments.get(
            "VRFCoordinatorV2Mock"
        );
        //address of mock contract
        vRFCoordinatorV2Address = vRFCoordinatorV2Mock.address;

        //associate contract information with signer
        // interract with the mock contract
        mockContract = await ethers.getContractAt(
            "VRFCoordinatorV2Mock",
            vRFCoordinatorV2Address,
            signer
        );
        // const transactionResponse =
        //     await vRFCoordinatorV2Mock.createSubscription();
        const transactionResponse = await mockContract.createSubscription();

        const transactionReceipt = await transactionResponse.wait(1);
        // console.log("logs", transactionReceipt.logs[0].args.subId);

        subscriptionId = transactionReceipt.logs[0].args.subId;
        await mockContract.fundSubscription(subscriptionId, vrfFundAmount);
        // await mockContract.addConsumer(subscriptionId, lotteryAddress);
    } else {
        vRFCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorAddress;
        subscriptionId = networkConfig[chainId].subscriptionId;
    }
    const entranceFee = networkConfig[chainId].entranceFee;
    const keyHash = networkConfig[chainId].keyHash;
    const callbackGasLimit = networkConfig[chainId].callbackGasLimit;
    const interval = networkConfig[chainId].interval;
    const args = [
        entranceFee,
        vRFCoordinatorV2Address,
        keyHash,
        subscriptionId,
        callbackGasLimit,
        interval,
    ];
    const deployLottery = await deploy("Lottery", {
        from: deployer,
        args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });
    const lotteryAddress = deployLottery.address;

    // Add the lotteryAddress as a consumer after it's initialized
    if (developmentChains.includes(network.name)) {
        await mockContract.addConsumer(subscriptionId, lotteryAddress);
    }

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verifyLottery(deployLottery.address, args);
    }
};
module.exports.tags = ["all", "lottery"];

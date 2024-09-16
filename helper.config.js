const { ethers } = require("hardhat");

const networkConfig = {
    11155111: {
        name: "sepolia",
        vrfCoordinatorAddress: "0xD7f86b4b8Cae7D942340FF628F82735b7a20893a",
        entranceFee: ethers.parseEther("0.01"),
        keyHash:
            "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
        subscriptionId: "",
        callbackGasLimit: "500000", //we set a call back gas limit of 500k gas
        interval: "30", //we set a 30 second interval
    },
    31337: {
        name: "hardhat",
        entranceFee: ethers.parseEther("0.01"),
        keyHash:
            "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
        callbackGasLimit: "500000", //we set a call back gas limit of 500k gas
        interval: "30", //we set a 30 second interval
    },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = {
    networkConfig,
    developmentChains,
};

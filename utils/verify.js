const hre = require("hardhat");

const verifyLottery = async (contractAddress, args) => {
    console.log("Verifying Lottery contract...");

    try {
        await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        });
    } catch (error) {
        if (error.message.toLowerCase().includes("already verified")) {
            console.log("Lottery contract already verified");
        } else {
            console.log(error);
        }
    }
};

module.exports = { verifyLottery };

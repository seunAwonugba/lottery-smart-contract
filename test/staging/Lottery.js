const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper.config");
const { expect, assert } = require("chai");

if (developmentChains.includes(network.name)) {
    describe.skip;
} else {
    describe("Lottery", async () => {
        let lottery;
        // let vRFCoordinatorV2Mock;
        let deployer;
        const chainId = network.config.chainId;
        let entranceFee;
        let interval;
        let lotteryAddress;

        beforeEach(async () => {
            //getNamedAccounts is specific to hardhat, cause its used to retrieve accounts from hardhat config namedAccounts
            deployer = (await getNamedAccounts()).deployer;

            //get the lottery contract and connect it to the deployer
            lottery = await ethers.getContract("Lottery", deployer);
            lotteryAddress = await lottery.getAddress();

            entranceFee = await lottery.getEntranceFee();
            // interval = await lottery.getInterval();
        });

        describe("fulfil random words", () => {
            it("live chain link keepers and vrf returns random winner", async () => {
                const accounts = await ethers.getSigners();
                //set up a listener
                await new Promise(async (resolve, reject) => {
                    lottery.once("WinnerPicked", async () => {
                        console.log("Winner picked");
                        resolve();

                        try {
                            const winner = await lottery.getWinner();
                            const lotteryState =
                                await lottery.getLotteryState();
                            const winnersEntryBalance =
                                await accounts[0].getBalance();

                            await expect(lottery.getPlayer(0)).to.be.reverted;

                            assert.equal(
                                winner.toString(),
                                accounts[0].address
                            );
                            assert.equal(lotteryState, "0");
                            assert.equal(
                                winnersEndingBalance.toString(),
                                winnersEntryBalance.add(entranceFee).toString()
                            );
                            resolve();
                        } catch (error) {
                            console.log("error", error);
                            reject(error);
                        }
                    });

                    const joinLottery = await lottery.joinLottery({
                        value: entranceFee,
                    });
                    console.log("joinLottery", joinLottery);

                    const winnersEndingBalance = await accounts[0].getBalance();
                });
            });
        });
    });
}

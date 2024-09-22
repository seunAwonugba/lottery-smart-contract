const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper.config");
const { assert, expect } = require("chai");

if (developmentChains.includes(network.name)) {
    describe("Lottery", async () => {
        let lottery;
        let vRFCoordinatorV2Mock;
        let deployer;
        const chainId = network.config.chainId;
        let entranceFee;
        let interval;

        beforeEach(async () => {
            //getNamedAccounts is specific to hardhat, cause its used to retrieve accounts from hardhat config namedAccounts
            deployer = (await getNamedAccounts()).deployer;
            //deploy contracts with the "all" tag
            await deployments.fixture(["all"]);

            //get the lottery contract and connect it to the deployer
            lottery = await ethers.getContract("Lottery", deployer);
            vRFCoordinatorV2Mock = await ethers.getContract(
                "VRFCoordinatorV2Mock",
                deployer
            );
            entranceFee = await lottery.getEntranceFee();
            interval = await lottery.getInterval();
        });

        describe("constructor", async () => {
            it("Initialize lottery state correctly", async () => {
                const lotteryState = await lottery.getLotteryState();

                assert.equal(lotteryState.toString(), "0");
            });
            it("Initialize interval correctly", async () => {
                assert.equal(
                    interval.toString(),
                    networkConfig[chainId].interval
                );
            });
        });

        describe("Join lottery", async () => {
            it("insufficient entrance fee", async () => {
                await expect(
                    lottery.joinLottery()
                ).to.be.revertedWithCustomError(
                    lottery,
                    "Lottery_Insufficient_ETH_Balance"
                );
            });

            it("Player joins the lottery", async () => {
                await lottery.joinLottery({ value: entranceFee });

                const player = await lottery.getPlayer(0);

                assert.equal(player, deployer);
            });

            it("Emits player joins event", async () => {
                await expect(
                    lottery.joinLottery({ value: entranceFee })
                ).to.emit(lottery, "NewLotteryPlayer");
            });

            it("revert when lottery state is not opened", async () => {
                await lottery.joinLottery({
                    value: entranceFee,
                });
                await network.provider.send("evm_increaseTime", [
                    Number(interval) + 1,
                ]);
                await network.provider.send("evm_mine", []);

                await lottery.performUpkeep("0x");

                await expect(
                    lottery.joinLottery()
                ).to.be.revertedWithCustomError(
                    lottery,
                    "Lottery_LotteryStateNotOpen"
                );
            });
        });
    });
}

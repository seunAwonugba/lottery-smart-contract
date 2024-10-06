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
        let lotteryAddress;

        beforeEach(async () => {
            //getNamedAccounts is specific to hardhat, cause its used to retrieve accounts from hardhat config namedAccounts
            deployer = (await getNamedAccounts()).deployer;
            //deploy contracts with the "all" tag
            await deployments.fixture(["all"]);

            //get the lottery contract and connect it to the deployer
            lottery = await ethers.getContract("Lottery", deployer);
            lotteryAddress = await lottery.getAddress();

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

        describe("check upkeep", async () => {
            it("returns false when no user", async () => {
                await network.provider.send("evm_increaseTime", [
                    Number(interval) + 1,
                ]);
                await network.provider.send("evm_mine", []);
                const { upkeepNeeded } = await lottery.checkUpkeep.staticCall(
                    "0x"
                );
                assert(!upkeepNeeded);
            });

            it("returns false when lottery state is not open", async () => {
                // perform all action except lottery opened
                //has players
                await lottery.joinLottery({ value: entranceFee });
                //time passed

                await network.provider.send("evm_increaseTime", [
                    Number(interval) + 1,
                ]);
                await network.provider.send("evm_mine", []);

                await lottery.performUpkeep("0x");
                const lotteryState = await lottery.getLotteryState();
                const { upkeepNeeded } = await lottery.checkUpkeep.staticCall(
                    "0x"
                );
                assert.equal(lotteryState.toString(), "1");
                assert.equal(upkeepNeeded, false);
            });
        });

        describe("perform upkeep", () => {
            it("run when check upkeep is true", async () => {
                await lottery.joinLottery({ value: entranceFee });
                //time passed

                await network.provider.send("evm_increaseTime", [
                    Number(interval) + 1,
                ]);
                await network.provider.send("evm_mine", []);

                const transaction = await lottery.performUpkeep("0x");
                assert(transaction);
            });
            it("revert when upkeepNeeded is false", async () => {
                await expect(
                    lottery.performUpkeep("0x")
                ).to.be.revertedWithCustomError(
                    lottery,
                    "Lottery_UpkeepNotNeeded"
                );
            });

            // it("request random number", async () => {
            //     await lottery.joinLottery({ value: entranceFee });
            //     //time passed

            //     await network.provider.send("evm_increaseTime", [
            //         Number(interval) + 1,
            //     ]);
            //     await network.provider.send("evm_mine", []);

            //     const transaction = await lottery.performUpkeep("0x");
            //     const transactionReceipt = await transaction.wait(1);
            //     // console.log(transactionReceipt);
            //     console.log(transactionReceipt.logs[1].args);

            //     const requestId = transactionReceipt.events[1].args.requestId;
            //     assert(Number(requestId) > 0);
            //     const lotteryState = await lottery.getLotteryState();
            //     assert(lotteryState.toString() == "1");
            // });
        });

        describe("fulfillRandomWords", () => {
            beforeEach(async () => {
                await lottery.joinLottery({ value: entranceFee });
                await network.provider.send("evm_increaseTime", [
                    Number(interval) + 1,
                ]);
                await network.provider.send("evm_mine", []);
            });

            it("call only after perform upkeep", async () => {
                await expect(
                    vRFCoordinatorV2Mock.fulfillRandomWords(0, lotteryAddress)
                ).to.be.revertedWith("nonexistent request");
                await expect(
                    vRFCoordinatorV2Mock.fulfillRandomWords(1, lotteryAddress)
                ).to.be.revertedWith("nonexistent request");
            });

            it("picks a winner, resets lottery and sends money", async () => {
                const additionalUsers = 3;
                const startingAccountIndex = 1;
                const accounts = await ethers.getSigners();

                for (
                    let index = startingAccountIndex;
                    index < startingAccountIndex + additionalUsers;
                    index++
                ) {
                    const newUsers = lottery.connect(accounts[index]);
                    await newUsers.joinLottery({ value: entranceFee });
                    // console.log(newUsers);
                }
                // const startingTimeStamp = await lottery.getLastTimeStamp();

                await new Promise(async (reject, resolve) => {
                    lottery.once("Winner", async () => {
                        console.log("Event found");

                        try {
                            const winner = await lottery.getWinner();
                            const lotteryState =
                                await lottery.getLotteryState();

                            const noOfPlayers =
                                await lottery.getNumberOfPlayers();

                            assert.equal(noOfPlayers.toString(), "0");
                            assert.equal(lotteryState.toString(), "0");
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    });

                    const transaction = await lottery.performUpkeep("0x");
                    const transactionReceipt = transaction.wait(1);

                    await vRFCoordinatorV2Mock.fulfillRandomWords(
                        transactionReceipt.events[1].args.requestId,
                        lotteryAddress
                    );
                });
            });
        });
    });
}

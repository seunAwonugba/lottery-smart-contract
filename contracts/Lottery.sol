// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

error Lottery_Insufficient_ETH_Balance();
error Lottery_WinnerTransferFailed();
error Lottery_LotteryStateNotOpen();
error Lottery_UpkeepNotNeeded(
    uint balance,
    uint numberOfPlayers,
    uint lotteryState
);

import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/**
 * @title Lottery Smart Contract
 * @author Awonugbs Seun
 * @notice Practice project
 * @dev This contract imports some external contracts VRFConsumerBaseV2 and AutomationCompatibleInterface
 */
contract Lottery is VRFConsumerBaseV2, AutomationCompatibleInterface {

    enum LotteryState {
        OPEN,
        CALCULATING
    }
    // i want users coming on board to pay a base fee so they can participate in the game
    uint private immutable entranceFee;
    bytes32 private immutable keyHash;
    uint64 private immutable s_subscriptionId;
    uint32 private immutable callbackGasLimit;
    uint private immutable interval;

    uint16 private constant requestConfirmations = 3;
    uint32 private constant numWords = 1;

    address private winner;
    uint private lastBlockTimestamp;

    //track the list of players, players are the users that get into the game successfully
    address payable[] private players;

    LotteryState private lotteryState;

    event NewLotteryPlayer(address indexed player);
    event RequestedRandomNumberId(uint requestedId);
    event Winner(address indexed winner);

    // to call a function in an interface you need to pass in the address of the contract inpmelemting the interface
    VRFCoordinatorV2Interface private immutable COORDINATOR;

    constructor(
        uint _entranceFee,
        address vRFConsumerBaseV2,
        bytes32 _keyHash,
        uint64 _s_subscriptionId,
        uint32 _callbackGasLimit,
        uint _interval
    ) VRFConsumerBaseV2(vRFConsumerBaseV2) {
        entranceFee = _entranceFee;
        //In Solidity, when you want to interact with a function defined in an interface, you need to know the specific address of the contract that implements the interface.
        COORDINATOR = VRFCoordinatorV2Interface(vRFConsumerBaseV2);
        keyHash = _keyHash;
        s_subscriptionId = _s_subscriptionId;
        callbackGasLimit = _callbackGasLimit;
        lotteryState = LotteryState.OPEN;
        lastBlockTimestamp = block.timestamp;
        interval = _interval;
    }

    function joinLottery() public payable {
        if (lotteryState != LotteryState.OPEN) {
            revert Lottery_LotteryStateNotOpen();
        }
        if (msg.value < entranceFee) {
            revert Lottery_Insufficient_ETH_Balance();
        }

        //msg.sender is an address, but not payable, and players only takes a payable address
        //type cast it to a payable address
        players.push(payable(msg.sender));
        emit NewLotteryPlayer(msg.sender);
    }

    // external because its only another contract that will be calling it, that it the contract used to get the random number
    // it does not have to be public
    function requestRandomNumber() internal {
        //function requestRandomWords from the interface returns a request id that is used to geth the random words

        lotteryState = LotteryState.CALCULATING;
        uint randomNumberId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        emit RequestedRandomNumberId(randomNumberId);
    }

    // this function is meant to receive random number from chainlink and then store it with my contract
    function fulfillRandomWords(
        uint256 /* requestId */,
        uint256[] memory randomWords
    ) internal override {
        uint indexOfWinner = randomWords[0] % players.length;
        address payable _winner = players[indexOfWinner];
        winner = _winner;

        //when you have a winner, send all the money in contrct to winner
        (bool callSuccess, ) = winner.call{value: (address(this).balance)}("");
        if (!callSuccess) {
            revert Lottery_WinnerTransferFailed();
        }
        emit Winner(winner);
        players = new address payable[](0);
        lastBlockTimestamp = block.timestamp;
        lotteryState = LotteryState.OPEN;
    }

    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        override
        returns (bool upkeepNeeded, bytes memory /* performData */)
    {
        bool isOpen = (lotteryState == LotteryState.OPEN);
        bool timePassed = ((block.timestamp - lastBlockTimestamp) > interval);
        bool hasPlayers = (players.length > 0);
        // check if money day this contract
        bool hasBalance = address(this).balance > 0;

        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
        // return (upkeepNeeded, bytes(""));
    }

    function performUpkeep(bytes calldata /* performData */) external override {
        (bool upkeepNeeded, ) = this.checkUpkeep("");
        if (!upkeepNeeded) {
            revert Lottery_UpkeepNotNeeded(
                address(this).balance,
                players.length,
                uint(lotteryState)
            );
        }
        requestRandomNumber();
    }

    function getWinner() public view returns (address) {
        return winner;
    }

    // i want users to be able to see the entrance fee they will pay to participate in the game
    function getEntranceFee() public view returns (uint) {
        return entranceFee;
    }

    function getPlayers() public view returns (address payable[] memory) {
        return players;
    }

    function getPlayer(uint index) public view returns (address) {
        return players[index];
    }

    function getLotteryState() public view returns (LotteryState) {
        return lotteryState;
    }

    function getNumberOfPlayers() public view returns (uint) {
        return players.length;
    }

    function getInterval() public view returns (uint) {
        return interval;
    }
}

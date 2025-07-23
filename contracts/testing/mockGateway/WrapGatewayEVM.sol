// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {NodeLogicMock} from "./NodeLogicMock.sol";
import {RevertOptions} from "@zetachain/protocol-contracts/contracts/Revert.sol";

contract WrapGatewayEVM {
    // Immutable variables stored in bytecode
    address public immutable GATEWAY_IMPL;
    address public immutable NODE_LOGIC;
    uint256 public immutable CHAIN_ID;

    // Function selectors
    bytes4 private constant DEPOSIT_SELECTOR =
        bytes4(
            keccak256("deposit(address,(address,bool,address,bytes,uint256))")
        );
    bytes4 private constant DEPOSIT_TOKEN_SELECTOR =
        bytes4(
            keccak256(
                "deposit(address,uint256,address,(address,bool,address,bytes,uint256))"
            )
        );
    bytes4 private constant DEPOSIT_AND_CALL_SELECTOR =
        bytes4(
            keccak256(
                "depositAndCall(address,bytes,(address,bool,address,bytes,uint256))"
            )
        );
    bytes4 private constant DEPOSIT_AND_CALL_TOKEN_SELECTOR =
        bytes4(
            keccak256(
                "depositAndCall(address,uint256,address,bytes,(address,bool,address,bytes,uint256))"
            )
        );
    bytes4 private constant CALL_SELECTOR =
        bytes4(
            keccak256(
                "call(address,bytes,(address,bool,address,bytes,uint256))"
            )
        );

    constructor(address _gateway, address _nodeLogic, uint256 _chainId) {
        GATEWAY_IMPL = _gateway;
        NODE_LOGIC = _nodeLogic;
        CHAIN_ID = _chainId;
    }

    fallback() external payable {
        // First delegate call to implementation for all functions
        (bool success, bytes memory result) = GATEWAY_IMPL.delegatecall(
            msg.data
        );
        require(success, "Gateway delegatecall failed");

        _handleNodeLogic(msg.data);

        assembly {
            return(add(result, 32), mload(result))
        }
    }

    function _handleNodeLogic(bytes calldata data) internal {
        bytes4 selector = bytes4(data[:4]);
        if (selector == DEPOSIT_SELECTOR) {
            (address receiver, RevertOptions memory revertOptions) = abi.decode(
                data[4:],
                (address, RevertOptions)
            );
            NodeLogicMock(NODE_LOGIC).handleEVMDeposit(
                CHAIN_ID,
                msg.sender,
                receiver,
                msg.value,
                address(0),
                revertOptions
            );
        } else if (selector == DEPOSIT_TOKEN_SELECTOR) {
            (
                address receiver,
                uint256 amount,
                address asset,
                RevertOptions memory revertOptions
            ) = abi.decode(
                    data[4:],
                    (address, uint256, address, RevertOptions)
                );
            NodeLogicMock(NODE_LOGIC).handleEVMDeposit(
                CHAIN_ID,
                msg.sender,
                receiver,
                amount,
                asset,
                revertOptions
            );
        } else if (selector == DEPOSIT_AND_CALL_SELECTOR) {
            (
                address receiver,
                bytes memory payload,
                RevertOptions memory revertOptions
            ) = abi.decode(data[4:], (address, bytes, RevertOptions));
            NodeLogicMock(NODE_LOGIC).handleEVMDepositAndCall(
                CHAIN_ID,
                msg.sender,
                receiver,
                msg.value,
                address(0),
                payload,
                revertOptions
            );
        } else if (selector == DEPOSIT_AND_CALL_TOKEN_SELECTOR) {
            (
                address receiver,
                uint256 amount,
                address asset,
                bytes memory payload,
                RevertOptions memory revertOptions
            ) = abi.decode(
                    data[4:],
                    (address, uint256, address, bytes, RevertOptions)
                );
            NodeLogicMock(NODE_LOGIC).handleEVMDepositAndCall(
                CHAIN_ID,
                msg.sender,
                receiver,
                amount,
                asset,
                payload,
                revertOptions
            );
        } else if (selector == CALL_SELECTOR) {
            (
                address receiver,
                bytes memory payload,
                RevertOptions memory revertOptions
            ) = abi.decode(data[4:], (address, bytes, RevertOptions));
            NodeLogicMock(NODE_LOGIC).handleEVMCall(
                CHAIN_ID,
                msg.sender,
                receiver,
                payload,
                revertOptions
            );
        }
    }
}

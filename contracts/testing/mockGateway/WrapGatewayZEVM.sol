// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {NodeLogicMock} from "./NodeLogicMock.sol";
import {CallOptions} from "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";
import {RevertOptions} from "@zetachain/protocol-contracts/contracts/Revert.sol";

contract WrapGatewayZEVM {
    // Immutable variables stored in bytecode
    address public immutable GATEWAY_ZEVM_IMPL;
    address public immutable NODE_LOGIC;

    // Function selectors from GatewayZEVM
    bytes4 private constant CALL_SELECTOR =
        bytes4(
            keccak256(
                "call(bytes,address,bytes,(uint256,bool),(address,bool,address,bytes,uint256))"
            )
        );
    bytes4 private constant WITHDRAW_SELECTOR =
        bytes4(
            keccak256(
                "withdraw(bytes,uint256,address,(address,bool,address,bytes,uint256))"
            )
        );
    bytes4 private constant WITHDRAW_AND_CALL_SELECTOR =
        bytes4(
            keccak256(
                "withdrawAndCall(bytes,uint256,address,bytes,(uint256,bool),(address,bool,address,bytes,uint256))"
            )
        );

    constructor(address _gateway, address _nodeLogic) {
        GATEWAY_ZEVM_IMPL = _gateway;
        NODE_LOGIC = _nodeLogic;
    }

    receive() external payable {}

    fallback() external payable {
        // First delegate call to implementation for all functions
        (bool success, bytes memory result) = GATEWAY_ZEVM_IMPL.delegatecall(
            msg.data
        );
        require(success, "GatewayZEVM delegatecall failed");

        _handleNodeLogic(msg.data);

        assembly {
            return(add(result, 32), mload(result))
        }
    }

    function _handleNodeLogic(bytes calldata data) internal {
        bytes4 selector;
        assembly {
            selector := calldataload(0)
        }

        if (selector == CALL_SELECTOR) {
            (
                bytes memory receiver,
                address zrc20,
                bytes memory message,
                CallOptions memory callOptions,
                RevertOptions memory revertOptions
            ) = abi.decode(
                    data[4:],
                    (bytes, address, bytes, CallOptions, RevertOptions)
                );

            NodeLogicMock(NODE_LOGIC).handleZEVMCall(
                msg.sender,
                receiver,
                zrc20,
                message,
                callOptions,
                revertOptions
            );
        } else if (selector == WITHDRAW_SELECTOR) {
            (
                bytes memory receiver,
                uint256 amount,
                address zrc20,
                RevertOptions memory revertOptions
            ) = abi.decode(data[4:], (bytes, uint256, address, RevertOptions));

            NodeLogicMock(NODE_LOGIC).handleZEVMWithdraw(
                msg.sender,
                receiver,
                amount,
                zrc20,
                revertOptions
            );
        } else if (selector == WITHDRAW_AND_CALL_SELECTOR) {
            (
                bytes memory receiver,
                uint256 amount,
                address zrc20,
                bytes memory message,
                CallOptions memory callOptions,
                RevertOptions memory revertOptions
            ) = abi.decode(
                    data[4:],
                    (bytes, uint256, address, bytes, CallOptions, RevertOptions)
                );

            NodeLogicMock(NODE_LOGIC).handleZEVMWithdrawAndCall(
                msg.sender,
                receiver,
                amount,
                zrc20,
                message,
                callOptions,
                revertOptions
            );
        }
    }
}

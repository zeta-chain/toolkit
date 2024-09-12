// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {RevertContext} from "./Revert.sol";

struct zContext {
    bytes origin;
    address sender;
    uint256 chainID;
}

/// @custom:deprecated should be removed once v2 SystemContract is not used anymore.
/// UniversalContract should be used
interface zContract {
    function onCrossChainCall(
        zContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external;
}

interface UniversalContract {
    function onCrossChainCall(
        zContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external;

    function onRevert(RevertContext calldata revertContext) external;
}

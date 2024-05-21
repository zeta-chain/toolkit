// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "./OnlySystem.sol";
import "./BytesHelperLib.sol";
import "./SwapHelperLib.sol";
import "@zetachain/protocol-contracts/contracts/zevm/SystemContract.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IWZETA.sol";

abstract contract ZetaChain is zContract, OnlySystem {

    constructor() OnlySystem() {
    }
}

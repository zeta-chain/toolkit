// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "./OnlySystem.sol";
import "./BytesHelperLib.sol";
import "./SwapHelperLib.sol";
import "@zetachain/protocol-contracts/contracts/zevm/SystemContract.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IWZETA.sol";

abstract contract ZetaChain is zContract, OnlySystem {
    SystemContract public systemContract;
    mapping(uint256 => address) private systemContracts;

    constructor() OnlySystem(_initializeSystemContracts()) {
        address systemContractAddress = systemContracts[block.chainid];
        systemContract = SystemContract(systemContractAddress);
    }

    function _initializeSystemContracts() private returns (address) {
        systemContracts[7000] = 0x91d18e54DAf4F677cB28167158d6dd21F6aB3921;
        systemContracts[7001] = 0xEdf1c3275d13489aCdC6cD6eD246E72458B8795B;
        return systemContracts[block.chainid];
    }
}

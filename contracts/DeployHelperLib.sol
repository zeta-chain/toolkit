// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title DeployHelperLib
/// @notice A library to help deploy contracts using raw bytecode and constructor arguments
library DeployHelperLib {
    /// @notice Deploys a contract using raw bytecode and constructor arguments
    /// @param bytecode The raw bytecode from the artifact JSON (.bytecode field)
    /// @param constructorArgs The ABI-encoded constructor arguments
    /// @return addr The address of the deployed contract
    function deploy(
        bytes memory bytecode,
        bytes memory constructorArgs
    ) internal returns (address addr) {
        bytes memory creation = bytes.concat(bytecode, constructorArgs);

        assembly {
            addr := create(0, add(creation, 0x20), mload(creation))
            if iszero(addr) {
                revert(0, 0)
            }
        }
    }
}

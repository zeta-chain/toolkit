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

    function omniChainSwap(
        zContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) internal virtual {
        address target;
        bytes memory to;

        if (context.chainID == 18332) {
            target = BytesHelperLib.bytesToAddress(message, 0);
            to = abi.encodePacked(BytesHelperLib.bytesToAddress(message, 20));
        } else {
            (address targetToken, bytes memory recipient) = abi.decode(
                message,
                (address, bytes)
            );
            target = targetToken;
            to = recipient;
        }

        address wzeta = systemContract.wZetaContractAddress();
        bool isTargetZeta = target == wzeta;
        uint256 inputForGas;
        address gasZRC20;
        uint256 gasFee;

        if (!isTargetZeta) {
            (gasZRC20, gasFee) = IZRC20(target).withdrawGasFee();

            inputForGas = SwapHelperLib.swapTokensForExactTokens(
                systemContract,
                zrc20,
                gasFee,
                gasZRC20,
                amount
            );
        }

        uint256 outputAmount = SwapHelperLib.swapExactTokensForTokens(
            systemContract,
            zrc20,
            isTargetZeta ? amount : amount - inputForGas,
            target,
            0
        );

        if (isTargetZeta) {
            IWETH9(wzeta).transfer(address(uint160(bytes20(to))), outputAmount);
        } else {
            IZRC20(gasZRC20).approve(target, gasFee);
            IZRC20(target).withdraw(to, outputAmount);
        }
    }
}

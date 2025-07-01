// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./DeployHelperLib.sol";

import {Test} from "forge-std/Test.sol";

interface IUniswapV2Router02 {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
}

interface IUniswapV2Factory {
    function createPair(
        address tokenA,
        address tokenB
    ) external returns (address pair);

    function getPair(
        address tokenA,
        address tokenB
    ) external view returns (address pair);
}

contract UniswapV2SetupLib is Test {
    /// @notice Deploys Uniswap V2 Factory and Router
    /// @param deployer Address that will deploy the contracts (typically test wallet)
    /// @param wzeta Address of the WZETA token
    /// @return factory Address of deployed UniswapV2Factory
    /// @return router Address of deployed UniswapV2Router02
    function prepareUniswapV2(
        address deployer,
        address wzeta
    ) public returns (address factory, address router) {
        vm.startPrank(deployer);
        factory = DeployHelperLib.deploy(
            vm.parseJsonBytes(
                vm.readFile(
                    "node_modules/@uniswap/v2-core/build/UniswapV2Factory.json"
                ),
                ".evm.bytecode.object"
            ),
            abi.encode(deployer)
        );
        router = DeployHelperLib.deploy(
            vm.parseJsonBytes(
                vm.readFile(
                    "node_modules/@uniswap/v2-periphery/build/UniswapV2Router02.json"
                ),
                ".evm.bytecode.object"
            ),
            abi.encode(factory, wzeta)
        );
        vm.stopPrank();
    }

    /// @notice Creates pair and adds liquidity to Uniswap V2
    /// @param uniswapV2Router Address of the UniswapV2Router02
    /// @param uniswapV2Factory Address of the UniswapV2Factory
    /// @param zrc20 Token to pair with WZETA
    /// @param wzeta The wrapped native token (e.g. WZETA)
    /// @param deployer Who will approve and add liquidity
    /// @param zrc20Amount Amount of zrc20 to add
    /// @param wzetaAmount Amount of wzeta to add
    function uniswapV2AddLiquidity(
        address uniswapV2Router,
        address uniswapV2Factory,
        address zrc20,
        address wzeta,
        address deployer,
        uint256 zrc20Amount,
        uint256 wzetaAmount
    ) public {
        vm.startPrank(deployer);

        IUniswapV2Factory(uniswapV2Factory).createPair(zrc20, wzeta);

        IERC20(zrc20).approve(uniswapV2Router, zrc20Amount);
        IERC20(wzeta).approve(uniswapV2Router, wzetaAmount);

        IUniswapV2Router02(uniswapV2Router).addLiquidity(
            zrc20,
            wzeta,
            zrc20Amount,
            wzetaAmount,
            0,
            0,
            deployer,
            block.timestamp + 15 minutes
        );

        vm.stopPrank();
    }
}

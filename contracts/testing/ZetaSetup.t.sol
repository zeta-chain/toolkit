// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {SystemContract} from "@zetachain/protocol-contracts/contracts/zevm/SystemContract.sol";
import {WETH9} from "@zetachain/protocol-contracts/contracts/zevm/WZETA.sol";
import {GatewayZEVM} from "@zetachain/protocol-contracts/contracts/zevm/GatewayZEVM.sol";
import {Test} from "forge-std/Test.sol";
import {UniswapV2SetupLib} from "./UniswapV2SetupLib.sol";
import {NodeLogicMock} from "./mockGateway/NodeLogicMock.sol";
import {WrapGatewayZEVM} from "./mockGateway/WrapGatewayZEVM.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {console} from "forge-std/console.sol";
import {UniswapV3SetupLib} from "./UniswapV3SetupLib.sol";

contract ZetaSetup is UniswapV2SetupLib, UniswapV3SetupLib {
    address public deployer;
    address public FUNGIBLE_MODULE_ADDRESS;
    address payable public wzeta;
    address public systemContract;
    address public uniswapV2Factory;
    address public uniswapV2Router;
    address public uniswapV3Factory;
    address public uniswapV3Router;
    address public uniswapV3PositionManager;
    NodeLogicMock public nodeLogicMock;
    GatewayZEVM public wrapGatewayZEVM;

    constructor(address _deployer, address _fungibleModuleAddress) {
        deployer = _deployer;
        FUNGIBLE_MODULE_ADDRESS = _fungibleModuleAddress;
    }

    function setupZetaChain() public {
        // Deploy WZETA
        vm.startPrank(deployer);
        wzeta = payable(address(new WETH9()));
        vm.stopPrank();

        // Setup initial WZETA balances and approvals
        vm.startPrank(FUNGIBLE_MODULE_ADDRESS);
        vm.deal(FUNGIBLE_MODULE_ADDRESS, 10 ether);
        WETH9(wzeta).deposit{value: 10 ether}();
        vm.stopPrank();

        vm.startPrank(deployer);
        vm.deal(deployer, 10 ether);
        WETH9(wzeta).deposit{value: 10 ether}();
        vm.stopPrank();

        // Setup Uniswap V2
        (uniswapV2Factory, uniswapV2Router) = prepareUniswapV2(deployer, wzeta);
        (
            uniswapV3Factory,
            uniswapV3Router,
            uniswapV3PositionManager
        ) = prepareUniswapV3(deployer, wzeta);

        // Deploy SystemContract
        vm.startPrank(FUNGIBLE_MODULE_ADDRESS);
        systemContract = address(
            new SystemContract(wzeta, uniswapV2Factory, uniswapV2Router)
        );

        // Deploy GatewayZEVM
        GatewayZEVM implementationZEVM = new GatewayZEVM();
        vm.stopPrank();

        // Setup NodeLogicMock and WrapGatewayZEVM
        vm.startPrank(deployer);
        nodeLogicMock = new NodeLogicMock();
        wrapGatewayZEVM = GatewayZEVM(
            payable(
                address(
                    new WrapGatewayZEVM(
                        address(implementationZEVM),
                        address(nodeLogicMock)
                    )
                )
            )
        );
        wrapGatewayZEVM.initialize(wzeta, deployer);
        vm.stopPrank();

        // Approve WZETA for GatewayZEVM
        vm.startPrank(FUNGIBLE_MODULE_ADDRESS);
        WETH9(wzeta).approve(address(wrapGatewayZEVM), 10 ether);
        vm.stopPrank();

        vm.startPrank(deployer);
        WETH9(wzeta).approve(address(wrapGatewayZEVM), 10 ether);
        vm.stopPrank();
    }
}

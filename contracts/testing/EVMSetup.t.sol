// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {ERC20Custody} from "@zetachain/protocol-contracts/contracts/evm/ERC20Custody.sol";
import {GatewayEVM} from "@zetachain/protocol-contracts/contracts/evm/GatewayEVM.sol";
import {ZetaConnectorNonNative} from "@zetachain/protocol-contracts/contracts/evm/ZetaConnectorNonNative.sol";
import {ZetaConnectorNative} from "@zetachain/protocol-contracts/contracts/evm/ZetaConnectorNative.sol";
import {Test} from "forge-std/Test.sol";
import {WrapGatewayEVM} from "./mockGateway/WrapGatewayEVM.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {console} from "forge-std/console.sol";
import "./DeployHelperLib.sol";

interface IZetaNonEth {
    function updateTssAndConnectorAddresses(
        address tssAddress_,
        address connectorAddress_
    ) external;
}

interface ITestERC20 {
    function mint(address to, uint256 amount) external;
}

contract EVMSetup is Test {
    address public deployer;
    address public tss;
    address public wzeta;
    address public systemContract;
    address public nodeLogicMockAddr;
    address public uniswapV2Router;

    mapping(uint256 => address) public custody;
    mapping(uint256 => address) public zetaConnector;
    mapping(uint256 => GatewayEVM) public wrapGatewayEVM;
    mapping(uint256 => address) public zetaToken;

    uint256 public constant chainIdETH = 5;

    constructor(
        address _deployer,
        address _tss,
        address _wzeta,
        address _systemContract,
        address _nodeLogicMock,
        address _uniswapV2Router
    ) {
        deployer = _deployer;
        tss = _tss;
        wzeta = _wzeta;
        systemContract = _systemContract;
        nodeLogicMockAddr = _nodeLogicMock;
        uniswapV2Router = _uniswapV2Router;
    }

    function setupEVMChain(uint256 chainId) public {
        vm.startPrank(deployer);

        // Deploy GatewayEVM
        GatewayEVM implementationEVM = new GatewayEVM();
        wrapGatewayEVM[chainId] = GatewayEVM(
            payable(
                address(
                    new WrapGatewayEVM(
                        address(implementationEVM),
                        nodeLogicMockAddr,
                        chainId
                    )
                )
            )
        );

        // Deploy Custody
        custody[chainId] = address(new ERC20Custody());

        // Deploy Zeta token
        if (chainId == chainIdETH) {
            bytes memory bytecode = vm.parseJsonBytes(
                vm.readFile(
                    "node_modules/@zetachain/protocol-contracts/abi/TestERC20.sol/TestERC20.json"
                ),
                ".bytecode.object"
            );
            zetaToken[chainId] = DeployHelperLib.deploy(
                bytecode,
                abi.encode("Zeta", "ZETA")
            );
        } else {
            bytes memory bytecode = vm.parseJsonBytes(
                vm.readFile(
                    "node_modules/@zetachain/protocol-contracts/abi/Zeta.non-eth.sol/ZetaNonEth.json"
                ),
                ".bytecode.object"
            );
            zetaToken[chainId] = DeployHelperLib.deploy(
                bytecode,
                abi.encode(tss, deployer)
            );
        }

        // Initialize Gateway
        wrapGatewayEVM[chainId].initialize(tss, zetaToken[chainId], deployer);

        // Initialize Custody
        ERC20Custody(custody[chainId]).initialize(
            address(wrapGatewayEVM[chainId]),
            tss,
            deployer
        );

        // Deploy ZetaConnector with Proxy
        if (chainId == chainIdETH) {
            // Deploy Native Connector
            ZetaConnectorNative connectorImpl = new ZetaConnectorNative();
            bytes memory initData = abi.encodeWithSelector(
                ZetaConnectorNative.initialize.selector,
                address(wrapGatewayEVM[chainId]),
                zetaToken[chainId],
                tss,
                deployer
            );
            zetaConnector[chainId] = address(
                new ERC1967Proxy(address(connectorImpl), initData)
            );
        } else {
            // Deploy NonNative Connector
            ZetaConnectorNonNative connectorImpl = new ZetaConnectorNonNative();
            bytes memory initData = abi.encodeWithSelector(
                ZetaConnectorNonNative.initialize.selector,
                address(wrapGatewayEVM[chainId]),
                zetaToken[chainId],
                tss,
                deployer
            );
            zetaConnector[chainId] = address(
                new ERC1967Proxy(address(connectorImpl), initData)
            );
        }

        // Setup Gateway connections
        wrapGatewayEVM[chainId].setCustody(custody[chainId]);
        wrapGatewayEVM[chainId].setConnector(zetaConnector[chainId]);

        // Final setup for Zeta token
        if (chainId == chainIdETH) {
            ITestERC20(zetaToken[chainId]).mint(
                zetaConnector[chainId],
                1_000_000 * 1e18
            );
        } else {
            IZetaNonEth(zetaToken[chainId]).updateTssAndConnectorAddresses(
                tss,
                zetaConnector[chainId]
            );
        }

        vm.stopPrank();
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;
// External interfaces & contracts
import {SystemContract} from "@zetachain/protocol-contracts/contracts/zevm/SystemContract.sol";
import {ERC20Custody} from "@zetachain/protocol-contracts/contracts/evm/ERC20Custody.sol";
import {WETH9} from "@zetachain/protocol-contracts/contracts/zevm/WZETA.sol";

// Internal interfaces & libraries
import {CoinType} from "@zetachain/protocol-contracts/contracts/zevm/interfaces/IZRC20.sol";

import {UniswapV2SetupLib} from "./UniswapV2SetupLib.sol";
import "./UniswapV3SetupLib.sol";
import {ZRC20Mock} from "./mock/ZRC20Mock.sol";
import {ERC20Mock} from "./mock/ERC20Mock.sol";
import {Test} from "forge-std/Test.sol";
import {NodeLogicMock} from "./mockGateway/NodeLogicMock.sol"; 
import {WrapGatewayZEVM} from "./mockGateway/WrapGatewayZEVM.sol";
import {WrapGatewayEVM} from "./mockGateway/WrapGatewayEVM.sol";
import {GatewayZEVM} from "@zetachain/protocol-contracts/contracts/zevm/GatewayZEVM.sol";
import {GatewayEVM} from "@zetachain/protocol-contracts/contracts/evm/GatewayEVM.sol";
import {ZetaConnectorNonNative} from "@zetachain/protocol-contracts/contracts/evm/ZetaConnectorNonNative.sol";
import {console} from "forge-std/console.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ZetaSetup} from "./ZetaSetup.t.sol";
import {EVMSetup} from "./EVMSetup.t.sol";
import {TokenSetup} from "./TokenSetup.t.sol";

contract FoundrySetup is Test {
    address public deployer = address(1);
    address public FUNGIBLE_MODULE_ADDRESS = address(0x735b14BB79463307AAcBED86DAf3322B1e6226aB);
    address public tss = address(2);
    uint256 public chainIdZeta = 7000;
    uint256 public chainIdETH = 5;
    uint256 public chainIdBNB = 97;

   
    ZetaSetup public zetaSetup;
    EVMSetup public evmSetup;
    TokenSetup public tokenSetup;
    NodeLogicMock public nodeLogicMock;

    TokenSetup.TokenInfo public eth_eth;
    TokenSetup.TokenInfo public usdc_eth;
    TokenSetup.TokenInfo public bnb_bnb;
    TokenSetup.TokenInfo public usdc_bnb;

    function setUp() public virtual {
        vm.deal(tss, 1000000 ether);   
        // Setup ZetaChain
        zetaSetup = new ZetaSetup(
            deployer,
            FUNGIBLE_MODULE_ADDRESS
        );
        zetaSetup.setupZetaChain();
        
        // Setup EVM chains
        evmSetup = new EVMSetup(
            deployer,
            tss,
            zetaSetup.wzeta(),
            zetaSetup.systemContract(),
            address(zetaSetup.nodeLogicMock()),
            zetaSetup.uniswapV2Router()
        );
        
        // Initialize TokenSetup
        tokenSetup = new TokenSetup();
        // Setup ETH chain
        evmSetup.setupEVMChain(chainIdETH);
        eth_eth = tokenSetup.createToken(
            TokenSetup.Contracts({
                zetaSetup: zetaSetup,
                evmSetup: evmSetup,
                nodeLogicMock: zetaSetup.nodeLogicMock(),
                deployer: deployer,
                tss: tss
            }),
            "ETH",
            true,
            chainIdETH,
            18
        );
      
        usdc_eth = tokenSetup.createToken(
            TokenSetup.Contracts({
                zetaSetup: zetaSetup,
                evmSetup: evmSetup,
                nodeLogicMock: zetaSetup.nodeLogicMock(),
                deployer: deployer,
                tss: tss
            }),
            "USDC",
            false,
            chainIdETH,
            6
        );
        
        // Setup BNB chain
        evmSetup.setupEVMChain(chainIdBNB);
        bnb_bnb = tokenSetup.createToken(
            TokenSetup.Contracts({
                zetaSetup: zetaSetup,
                evmSetup: evmSetup,
                nodeLogicMock: zetaSetup.nodeLogicMock(),
                deployer: deployer,
                tss: tss
            }),
            "BNB",
            true,
            chainIdBNB,
            18
        );
        usdc_bnb = tokenSetup.createToken(
            TokenSetup.Contracts({
                zetaSetup: zetaSetup,
                evmSetup: evmSetup,
                nodeLogicMock: zetaSetup.nodeLogicMock(),
                deployer: deployer,
                tss: tss
            }),
            "USDC",
            false,
            chainIdBNB,
            6
        );

        // Setup NodeLogicMock mappings
        nodeLogicMock = zetaSetup.nodeLogicMock();
        nodeLogicMock.setGatewayZEVM(address(zetaSetup.wrapGatewayZEVM()));
        nodeLogicMock.setChainIdZeta(chainIdZeta);
        nodeLogicMock.setGatewayEVM(chainIdETH, address(evmSetup.wrapGatewayEVM(chainIdETH)));
        nodeLogicMock.setGatewayEVM(chainIdBNB, address(evmSetup.wrapGatewayEVM(chainIdBNB)));
        nodeLogicMock.setUniswapRouter(zetaSetup.uniswapV2Router());
        nodeLogicMock.setWZETA(zetaSetup.wzeta());

        // ETH chain mappings
        nodeLogicMock.setGasZRC20(chainIdETH, eth_eth.zrc20);
        nodeLogicMock.setAssetToZRC20(chainIdETH, address(0), eth_eth.zrc20);
        nodeLogicMock.setZRC20ToAsset(chainIdETH, eth_eth.zrc20, address(0));
        if (usdc_eth.asset != address(0)) {
            nodeLogicMock.setAssetToZRC20(chainIdETH, usdc_eth.asset, usdc_eth.zrc20);
            nodeLogicMock.setZRC20ToAsset(chainIdETH, usdc_eth.zrc20, usdc_eth.asset);
        }
        nodeLogicMock.setAssetToZRC20(
            chainIdETH,
            evmSetup.zetaToken(chainIdETH),
            zetaSetup.wzeta()
        );
        nodeLogicMock.setZRC20ToAsset(
            chainIdETH,
            zetaSetup.wzeta(),
            evmSetup.zetaToken(chainIdETH)
        );

        // BNB chain mappings
        nodeLogicMock.setGasZRC20(chainIdBNB, bnb_bnb.zrc20);
        nodeLogicMock.setAssetToZRC20(chainIdBNB, address(0), bnb_bnb.zrc20);
        nodeLogicMock.setZRC20ToAsset(chainIdBNB, bnb_bnb.zrc20, address(0));
        if (usdc_bnb.asset != address(0)) {
            nodeLogicMock.setAssetToZRC20(chainIdBNB, usdc_bnb.asset, usdc_bnb.zrc20);
            nodeLogicMock.setZRC20ToAsset(chainIdBNB, usdc_bnb.zrc20, usdc_bnb.asset);
        }
        nodeLogicMock.setAssetToZRC20(
            chainIdBNB,
            evmSetup.zetaToken(chainIdBNB),
            zetaSetup.wzeta()
        );
        nodeLogicMock.setZRC20ToAsset(
            chainIdBNB,
            zetaSetup.wzeta(),
            evmSetup.zetaToken(chainIdBNB)
        );

    
    }
}

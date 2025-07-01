// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {ZetaSetup} from "./ZetaSetup.t.sol";
import {EVMSetup} from "./EVMSetup.t.sol";
import {NodeLogicMock} from "./mockGateway/NodeLogicMock.sol";
import {ZRC20Mock} from "./mock/ZRC20Mock.sol";
import {ERC20Mock} from "./mock/ERC20Mock.sol";
import {CoinType} from "@zetachain/protocol-contracts/contracts/zevm/interfaces/IZRC20.sol";
import {SystemContract} from "@zetachain/protocol-contracts/contracts/zevm/SystemContract.sol";
import {WETH9} from "@zetachain/protocol-contracts/contracts/zevm/WZETA.sol";
import {ERC20Custody} from "@zetachain/protocol-contracts/contracts/evm/ERC20Custody.sol";
import {UniswapV3SetupLib} from "./UniswapV3SetupLib.sol";
import {UniswapV2SetupLib} from "./UniswapV2SetupLib.sol";
import {console} from "forge-std/console.sol";

contract TokenSetup is UniswapV2SetupLib, UniswapV3SetupLib {
    struct TokenInfo {
        address zrc20;
        address asset;
        string name;
        string symbol;
        uint256 chainId;
        bool isGasToken;
        uint8 decimals;
    }

    struct Contracts {
        ZetaSetup zetaSetup;
        EVMSetup evmSetup;
        NodeLogicMock nodeLogicMock;
        address deployer;
        address tss;
    }

    TokenInfo[] public foreignCoins;

    struct CreateTokenVars {
        string name;
        string fullSymbol;
        CoinType coinType;
        ZRC20Mock zrc20;
        address asset;
        uint256 zrc20Amount;
        uint256 wzetaAmount;
    }

    /// @notice Creates a token a specified EVM chain and returns token info
    /// @param contracts Struct containing all necessary contract addresses
    /// @param symbol Symbol of the token to be created
    /// @param isGasToken Boolean indicating if the token is a gas token
    /// @param chainId Chain ID where the token will be created
    /// @param decimals Number of decimals for the token
    /// @return TokenInfo Struct containing details of the created token
    /// @dev This function also deploys a ZRC20Mock contract, mints tokens,
    /// and adds liquidity to both Uniswap V2 and V3 pools.
    function createToken(
        Contracts memory contracts,
        string memory symbol,
        bool isGasToken,
        uint256 chainId,
        uint8 decimals
    ) public returns (TokenInfo memory) {
        CreateTokenVars memory vars;
        vars.name = string(
            abi.encodePacked("ZRC-20 ", symbol, " on ", vm.toString(chainId))
        );
        vars.fullSymbol = string(abi.encodePacked("ZRC20", symbol));
        vars.coinType = isGasToken ? CoinType.Gas : CoinType.ERC20;

        // Deploy ZRC20Mock
        vars.zrc20 = new ZRC20Mock(
            vars.name,
            vars.fullSymbol,
            decimals,
            chainId,
            vars.coinType,
            1, // gasLimit
            address(contracts.zetaSetup.systemContract()),
            address(contracts.zetaSetup.wrapGatewayZEVM())
        );

        // Handle asset creation
        vars.asset = address(0);
        if (isGasToken) {
            vm.startPrank(contracts.zetaSetup.FUNGIBLE_MODULE_ADDRESS());
            SystemContract(contracts.zetaSetup.systemContract())
                .setGasCoinZRC20(chainId, address(vars.zrc20));
            SystemContract(contracts.zetaSetup.systemContract()).setGasPrice(
                chainId,
                1 gwei
            );
            vm.stopPrank();
        } else {
            require(
                address(contracts.evmSetup.wrapGatewayEVM(chainId)) !=
                    address(0),
                "Gateway EVM not set for this chain"
            );
            vars.asset = createEVMToken(contracts, chainId, symbol);
        }

        // Mint tokens
        vars.zrc20.mint(
            contracts.deployer,
            10000000000 * 10 ** vars.zrc20.decimals()
        );
        vars.zrc20.mint(
            contracts.zetaSetup.FUNGIBLE_MODULE_ADDRESS(),
            10000000000 * 10 ** vars.zrc20.decimals()
        );

        // Add liquidity
        vm.startPrank(contracts.deployer);
        vm.deal(contracts.deployer, 1000000 ether);
        WETH9(contracts.zetaSetup.wzeta()).deposit{value: 1000 ether}();
        vars.zrc20Amount = 100 * (10 ** decimals);
        vars.wzetaAmount = 100 ether;

        uniswapV2AddLiquidity(
            contracts.zetaSetup.uniswapV2Router(),
            contracts.zetaSetup.uniswapV2Factory(),
            address(vars.zrc20),
            contracts.zetaSetup.wzeta(),
            contracts.deployer,
            vars.zrc20Amount,
            vars.wzetaAmount
        );
        LiquidityParams memory params = LiquidityParams({
            token0: address(vars.zrc20),
            token1: contracts.zetaSetup.wzeta(),
            recipient: contracts.deployer,
            amount0: vars.zrc20Amount,
            amount1: vars.wzetaAmount,
            factory: contracts.zetaSetup.uniswapV3Factory(),
            positionManager: contracts.zetaSetup.uniswapV3PositionManager()
        });
        uniswapV3AddLiquidity(params);
        vm.stopPrank();

        TokenInfo memory tokenInfo = TokenInfo({
            zrc20: address(vars.zrc20),
            asset: vars.asset,
            name: vars.name,
            symbol: symbol,
            chainId: chainId,
            isGasToken: isGasToken,
            decimals: decimals
        });

        foreignCoins.push(tokenInfo);
        return tokenInfo;
    }

    function createEVMToken(
        Contracts memory contracts,
        uint256 chainId,
        string memory symbol
    ) internal returns (address) {
        ERC20Mock erc20 = new ERC20Mock(symbol, symbol);
        uint256 decimals = erc20.decimals();

        vm.startPrank(contracts.deployer);
        erc20.approve(contracts.evmSetup.custody(chainId), type(uint256).max);
        erc20.mint(
            contracts.evmSetup.custody(chainId),
            1000000 * 10 ** decimals
        );
        erc20.mint(contracts.tss, 1000000 * 10 ** decimals);
        erc20.mint(contracts.deployer, 1000000 * 10 ** decimals);
        vm.stopPrank();

        vm.startPrank(contracts.tss);
        ERC20Custody(contracts.evmSetup.custody(chainId)).whitelist(
            address(erc20)
        );
        vm.stopPrank();

        return address(erc20);
    }

    function getForeignCoins() public view returns (TokenInfo[] memory) {
        return foreignCoins;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./DeployHelperLib.sol";

import {Test} from "forge-std/Test.sol";

interface IUniswapV3Pool {
    function initialize(uint160 sqrtPriceX96) external;

    function liquidity() external view returns (uint128);

    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );

    function token0() external view returns (address);

    function token1() external view returns (address);
}

interface INonfungiblePositionManager {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }

    function mint(
        MintParams calldata params
    )
        external
        returns (
            uint256 tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        );

    function positions(
        uint256 tokenId
    )
        external
        view
        returns (
            uint96 nonce,
            address operator,
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        );

    function ownerOf(uint256 tokenId) external view returns (address owner);
}

interface IUniswapV3Factory {
    function createPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external returns (address pool);

    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view returns (address pool);
}

contract UniswapV3SetupLib is Test {
    struct LiquidityParams {
        address token0;
        address token1;
        uint256 amount0;
        uint256 amount1;
        address factory;
        address positionManager;
        address recipient;
    }

    struct PoolVerificationParams {
        address poolAddress;
        address expectedToken0;
        address expectedToken1;
        address positionManager;
        address expectedOwner;
        uint256 tokenId;
        bool verbose;
    }

    struct V3LiquidityInfo {
        uint160 currentSqrtPrice;
        int24 currentTick;
        address actualOwner;
        uint128 poolLiquidity;
        address poolToken0;
        address poolToken1;
        uint128 positionLiquidity;
        address positionToken0;
        address positionToken1;
        int24 tickLower;
        int24 tickUpper;
        uint256 returnedTokenId;
    }

    /// @notice Deploys Uniswap V3 Factory, Router, and Nonfungible Position Manager
    /// @param deployer Address that will deploy the contracts (typically test wallet)
    /// @param wzeta Address of the WZETA token
    /// @return factory Address of deployed UniswapV3Factory
    /// @return router Address of deployed SwapRouter
    /// @return nonfungiblePositionManager Address of deployed NonfungiblePositionManager
    function prepareUniswapV3(
        address deployer,
        address wzeta
    )
        internal
        returns (
            address factory,
            address router,
            address nonfungiblePositionManager
        )
    {
        vm.startPrank(deployer);
        factory = DeployHelperLib.deploy(
            vm.parseJsonBytes(
                vm.readFile(
                    "node_modules/@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json"
                ),
                ".bytecode"
            ),
            ""
        );
        router = DeployHelperLib.deploy(
            vm.parseJsonBytes(
                vm.readFile(
                    "node_modules/@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json"
                ),
                ".bytecode"
            ),
            abi.encode(factory, wzeta)
        );
        nonfungiblePositionManager = DeployHelperLib.deploy(
            vm.parseJsonBytes(
                vm.readFile(
                    "node_modules/@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json"
                ),
                ".bytecode"
            ),
            abi.encode(factory, wzeta, router)
        );
        vm.stopPrank();
    }

    /// @notice Creates a Uniswap V3 pool and adds liquidity
    /// @param params Struct containing all parameters for adding liquidity
    function uniswapV3AddLiquidity(LiquidityParams memory params) internal {
        vm.startPrank(params.recipient);
        IERC20(params.token0).approve(params.positionManager, params.amount0);
        IERC20(params.token1).approve(params.positionManager, params.amount1);

        if (params.token0 > params.token1) {
            (params.token0, params.token1) = (params.token1, params.token0);
            (params.amount0, params.amount1) = (params.amount1, params.amount0);
        }

        address pool = createUniswapV3Pool(
            params.factory,
            params.token0,
            params.token1
        );
        assert(pool != address(0));
        uint256 tokenId = addLiquidityV3(
            params.positionManager,
            params.token0,
            params.token1,
            params.amount0,
            params.amount1,
            params.recipient
        );

        verifyV3Liquidity(
            PoolVerificationParams({
                poolAddress: pool,
                expectedToken0: params.token0,
                expectedToken1: params.token1,
                positionManager: params.positionManager,
                expectedOwner: params.recipient,
                tokenId: tokenId,
                verbose: false
            })
        );
        vm.stopPrank();
    }

    /// @notice Creates and initializes a Uniswap V3 pool
    /// @param factory Address of the Uniswap V3 Factory
    /// @param token0 First token in the pair
    /// @param token1 Second token in the pair
    /// @param fee Fee tier (e.g., 3000 = 0.3%)
    /// @return poolAddr The IUniswapV3Pool interface at the deployed address
    function createUniswapV3Pool(
        address factory,
        address token0,
        address token1,
        uint24 fee
    ) internal returns (address poolAddr) {
        // Deploy the pool
        IUniswapV3Factory(factory).createPool(token0, token1, fee);

        // Get deployed pool address
        poolAddr = IUniswapV3Factory(factory).getPool(token0, token1, fee);
        require(poolAddr != address(0), "UniswapV3SetupLib: Pool not created");

        // Initialize with sqrt(1) * 2^96 = 2^96 = 79228162514264337593543950336
        IUniswapV3Pool(poolAddr).initialize(79228162514264337593543950336);
    }

    /// @notice Creates and initializes a Uniswap V3 pool
    /// @param factory Address of the Uniswap V3 Factory
    /// @param token0 First token in the pair
    /// @param token1 Second token in the pair
    /// @return poolAddr The IUniswapV3Pool interface at the deployed address
    function createUniswapV3Pool(
        address factory,
        address token0,
        address token1
    ) internal returns (address poolAddr) {
        // Deploy the pool
        IUniswapV3Factory(factory).createPool(token0, token1, 3000);

        // Get deployed pool address
        poolAddr = IUniswapV3Factory(factory).getPool(token0, token1, 3000);
        require(poolAddr != address(0), "UniswapV3SetupLib: Pool not created");

        // Initialize with sqrt(1) * 2^96 = 2^96 = 79228162514264337593543950336
        IUniswapV3Pool(poolAddr).initialize(79228162514264337593543950336);
    }

    function addLiquidityV3(
        address nonfungiblePositionManager,
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        uint24 fee,
        address recipient,
        int24 tickLower,
        int24 tickUpper
    ) internal returns (uint256 tokenId) {
        // Add liquidity
        (tokenId, , , ) = INonfungiblePositionManager(
            nonfungiblePositionManager
        ).mint(
                INonfungiblePositionManager.MintParams({
                    token0: token0,
                    token1: token1,
                    fee: fee,
                    tickLower: tickLower,
                    tickUpper: tickUpper,
                    amount0Desired: amount0,
                    amount1Desired: amount1,
                    amount0Min: 0,
                    amount1Min: 0,
                    recipient: recipient,
                    deadline: block.timestamp + 15 minutes
                })
            );
    }

    function addLiquidityV3(
        address nonfungiblePositionManager,
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        address recipient
    ) internal returns (uint256 tokenId) {
        // Add liquidity
        (tokenId, , , ) = INonfungiblePositionManager(
            nonfungiblePositionManager
        ).mint(
                INonfungiblePositionManager.MintParams({
                    token0: token0,
                    token1: token1,
                    fee: 3000,
                    tickLower: -887220, // Example tick range for full range
                    tickUpper: 887220, // Example tick range
                    amount0Desired: amount0,
                    amount1Desired: amount1,
                    amount0Min: 0,
                    amount1Min: 0,
                    recipient: recipient,
                    deadline: block.timestamp + 15 minutes
                })
            );
    }

    function verifyV3Liquidity(
        PoolVerificationParams memory params
    ) internal view returns (V3LiquidityInfo memory info) {
        IUniswapV3Pool pool = IUniswapV3Pool(params.poolAddress);
        INonfungiblePositionManager manager = INonfungiblePositionManager(
            params.positionManager
        );

        info.poolLiquidity = pool.liquidity();
        require(info.poolLiquidity > 0, "Pool has no liquidity");

        (info.currentSqrtPrice, info.currentTick, , , , , ) = pool.slot0();
        info.poolToken0 = pool.token0();
        info.poolToken1 = pool.token1();

        require(info.poolToken0 == params.expectedToken0, "Unexpected token0");
        require(info.poolToken1 == params.expectedToken1, "Unexpected token1");

        (
            info.positionToken0,
            info.positionToken1,
            info.tickLower,
            info.tickUpper,
            info.positionLiquidity
        ) = getPositionInfo(manager, params.tokenId);

        require(info.positionLiquidity > 0, "Position has no liquidity");
        require(
            info.positionToken0 == info.poolToken0 &&
                info.positionToken1 == info.poolToken1,
            "Position tokens mismatch"
        );

        info.actualOwner = manager.ownerOf(params.tokenId);
        require(info.actualOwner == params.expectedOwner, "Unexpected owner");

        info.returnedTokenId = params.tokenId;
    }

    function getPositionInfo(
        INonfungiblePositionManager manager,
        uint256 tokenId
    )
        internal
        view
        returns (
            address positionToken0,
            address positionToken1,
            int24 tickLower,
            int24 tickUpper,
            uint128 positionLiquidity
        )
    {
        (
            ,
            ,
            positionToken0,
            positionToken1,
            ,
            tickLower,
            tickUpper,
            positionLiquidity,
            ,
            ,
            ,

        ) = manager.positions(tokenId);
    }
}

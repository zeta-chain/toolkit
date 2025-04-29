// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

library SwapLibrary {
    /**
     * @notice Swaps an exact amount of input tokens for as many output tokens as possible
     * @param inputToken Address of the token being sold
     * @param amountIn Amount of input tokens to swap
     * @param outputToken Address of the token being bought
     * @param uniswapRouter Address of the Uniswap V3 Router
     * @param wzeta Address of Wrapped ZETA token for multi-hop routing
     * @param poolFee The fee tier for the Uniswap V3 pool (e.g., 3000 for 0.3%)
     * @return amountOut Amount of output tokens received
     * @dev First attempts a direct swap, falls back to a multi-hop swap through WZETA if direct swap fails
     */
    function swapExactInputAmount(
        address inputToken,
        uint256 amountIn,
        address outputToken,
        address uniswapRouter,
        address wzeta,
        uint24 poolFee
    ) internal returns (uint256) {
        // Approve router to spend input tokens
        IERC20(inputToken).approve(uniswapRouter, amountIn);

        // Try direct swap first
        try
            ISwapRouter(uniswapRouter).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: inputToken,
                    tokenOut: outputToken,
                    fee: poolFee,
                    recipient: address(this),
                    deadline: block.timestamp + 15 minutes,
                    amountIn: amountIn,
                    amountOutMinimum: 0, // Let Uniswap handle slippage
                    sqrtPriceLimitX96: 0
                })
            )
        returns (uint256 amountOut) {
            // Reset approval after successful swap
            IERC20(inputToken).approve(uniswapRouter, 0);
            return amountOut;
        } catch {
            // If direct swap fails, try through WZETA using exactInput for multi-hop
            // The path is encoded as (tokenIn, fee, WZETA, fee, tokenOut)
            bytes memory path = abi.encodePacked(
                inputToken,
                poolFee,
                wzeta,
                poolFee,
                outputToken
            );

            ISwapRouter.ExactInputParams memory params = ISwapRouter
                .ExactInputParams({
                    path: path,
                    recipient: address(this),
                    deadline: block.timestamp + 15 minutes,
                    amountIn: amountIn,
                    amountOutMinimum: 0 // Let Uniswap handle slippage
                });

            uint256 amountOut = ISwapRouter(uniswapRouter).exactInput(params);
            IERC20(inputToken).approve(uniswapRouter, 0);
            return amountOut;
        }
    }

    /**
     * @notice Swaps as many input tokens as needed to receive an exact amount of output tokens
     * @param inputToken Address of the token being sold
     * @param amountOut Exact amount of output tokens desired
     * @param outputToken Address of the token being bought
     * @param uniswapRouter Address of the Uniswap V3 Router
     * @param wzeta Address of Wrapped ZETA token for multi-hop routing
     * @param poolFee The fee tier for the Uniswap V3 pool (e.g., 3000 for 0.3%)
     * @return amountIn Amount of input tokens spent
     * @dev First attempts a direct swap, falls back to a multi-hop swap through WZETA if direct swap fails
     */
    function swapExactOutputAmount(
        address inputToken,
        uint256 amountOut,
        address outputToken,
        address uniswapRouter,
        address wzeta,
        uint24 poolFee
    ) internal returns (uint256) {
        // Approve router to spend input tokens
        IERC20(inputToken).approve(uniswapRouter, type(uint256).max);

        // Try direct swap first
        try
            ISwapRouter(uniswapRouter).exactOutputSingle(
                ISwapRouter.ExactOutputSingleParams({
                    tokenIn: inputToken,
                    tokenOut: outputToken,
                    fee: poolFee,
                    recipient: address(this),
                    deadline: block.timestamp + 15 minutes,
                    amountOut: amountOut,
                    amountInMaximum: type(uint256).max, // Let Uniswap handle slippage
                    sqrtPriceLimitX96: 0
                })
            )
        returns (uint256 amountIn) {
            IERC20(inputToken).approve(uniswapRouter, 0);
            return amountIn;
        } catch {
            // If direct swap fails, try through WZETA using exactOutput for multi-hop
            // The path is encoded as (tokenOut, fee, WZETA, fee, tokenIn) in reverse order
            bytes memory path = abi.encodePacked(
                outputToken,
                poolFee,
                wzeta,
                poolFee,
                inputToken
            );

            ISwapRouter.ExactOutputParams memory params = ISwapRouter
                .ExactOutputParams({
                    path: path,
                    recipient: address(this),
                    deadline: block.timestamp + 15 minutes,
                    amountOut: amountOut,
                    amountInMaximum: type(uint256).max // Let Uniswap handle slippage
                });

            uint256 amountIn = ISwapRouter(uniswapRouter).exactOutput(params);
            IERC20(inputToken).approve(uniswapRouter, 0);
            return amountIn;
        }
    }
}

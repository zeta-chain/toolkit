#!/bin/bash

set -e

npx hardhat balances

npx hardhat omnichain Swap targetZRC20:address recipient minAmountOut:uint256
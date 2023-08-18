#!/bin/bash

set -e

npx hardhat balances

npx hardhat omnichain Swap targetZRC20:address recipient minAmountOut:uint256

npx hardhat compile --force --no-typechain

npx hardhat deploy --help

npx hardhat interact --help
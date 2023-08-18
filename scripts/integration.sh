#!/bin/bash

npx hardhat balances

npx hardhat omnichain Swap targetZRC20:address recipient minAmountOut:uint256

ls tasks

ls contracts
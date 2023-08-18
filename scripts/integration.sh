#!/bin/bash

set -e

npx hardhat balances

npx hardhat account --save

if [[ ! -f .env ]]; then
    echo ".env file was not created."
    exit 1
fi

if grep -E "^PRIVATE_KEY=[a-fA-F0-9]{64}$" .env; then
    echo "The .env file contains a valid PRIVATE_KEY entry without the 0x prefix."
else
    echo "The .env file doesn't contain a valid PRIVATE_KEY entry or it contains the 0x prefix."
    exit 1
fi


git reset --HARD
npx hardhat omnichain Swap targetZRC20:address recipient minAmountOut:uint256
npx hardhat compile --force --no-typechain
npx hardhat deploy --help
npx hardhat interact --help

git reset --HARD
npx hardhat messaging CrossChainMessage
npx hardhat compile --force --no-typechain
npx hardhat deploy --help
npx hardhat interact --help
#!/bin/bash

set -e

git clone https://github.com/zeta-chain/template

cd template

yarn

yarn link @zetachain/toolkit

npx hardhat balances

npx hardhat fees

npx hardhat account --save

if [[ ! -f .env ]]; then
    echo ".env file was not created."
    exit 1
fi

if grep -E "^PRIVATE_KEY=[a-fA-F0-9]{64}$" .env; then
    echo "The .env file contains a valid PRIVATE_KEY entry without the 0x prefix."
    rm .env
else
    echo "The .env file doesn't contain a valid PRIVATE_KEY entry or it contains the 0x prefix."
    exit 1
fi

git reset --hard HEAD
npx hardhat omnichain Swap targetZRC20:address recipient minAmountOut:uint256
npx hardhat compile --force --no-typechain
npx hardhat deploy --help
npx hardhat interact --help

ADDRESS=$(npx hardhat deploy --network zeta_testnet --json | jq -r '.address')

echo "Deployed contract address: $ADDRESS"

TX=$(npx hardhat interact --contract $ADDRESS --network goerli_testnet --amount 0.000000000000000001 --target-z-r-c20 $ADDRESS --recipient $ADDRESS --min-amount-out 0 --json | jq -r '.hash')

npx hardhat cctx $TX

git reset --hard HEAD
npx hardhat messaging CrossChainMessage
npx hardhat compile --force --no-typechain
npx hardhat deploy --help
npx hardhat interact --help
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

echo "TESTING OMNICHAIN CONTRACT"

git reset --hard HEAD
npx hardhat omnichain Swap targetZRC20:address recipient minAmountOut:uint256
npx hardhat compile --force --no-typechain

OMNICHAIN_CONTRACT=$(npx hardhat deploy --network zeta_testnet --json | jq -r '.address')

echo "Deployed omnichain contract address: $OMNICHAIN_CONTRACT"

echo "TESTING TRANSACTION THAT SHOULD SUCCEED"

OMNICHAIN_TX_SHOULD_SUCCEED=$(npx hardhat interact --contract $OMNICHAIN_CONTRACT --network goerli_testnet --amount 0.000000000000000001 --target-z-r-c20 $OMNICHAIN_CONTRACT --recipient $OMNICHAIN_CONTRACT --min-amount-out 0 --json | jq -r '.hash')

echo "TX hash: $OMNICHAIN_TX_SHOULD_SUCCEED"

OMNICHAIN_CCTX_SHOULD_SUCCEED=$(npx hardhat cctx $OMNICHAIN_TX_SHOULD_SUCCEED --json)

echo "CCTX: $OMNICHAIN_CCTX_SHOULD_SUCCEED"

echo "TESTING TRANSACTION THAT SHOULD FAIL"

OMNICHAIN_TX_SHOULD_FAIL=$(npx hardhat interact --contract 0x0000000000000000000000000000000000000000 --network goerli_testnet --amount 0.000000000000000001 --target-z-r-c20 $OMNICHAIN_CONTRACT --recipient $OMNICHAIN_CONTRACT --min-amount-out 0 --json | jq -r '.hash')

echo "TX hash: $OMNICHAIN_TX_SHOULD_FAIL"

npx hardhat cctx $OMNICHAIN_TX_SHOULD_FAIL --json || {
    exit_status=$?
    if [[ $exit_status -eq 0 ]]; then
        echo "The command was expected to fail but it succeeded."
        exit 1
    fi
}

echo "TESTING CROSS-CHAIN MESSAGING"

git reset --hard HEAD
npx hardhat messaging CrossChainMessage message:string --fees zeta
npx hardhat compile --force --no-typechain

CCM_CONTRACT=$(npx hardhat deploy --networks goerli_testnet,mumbai_testnet --json | jq -r '.goerli_testnet')

echo "Deployed CCM contract address: $CCM_CONTRACT"

CCM_FEE=$(npx hardhat fees --json | jq -r ".feesCCM.mumbai_testnet.totalFee")

echo "CCM fee: $CCM_FEE"

CCM_TX=$(npx hardhat interact --network goerli_testnet --contract $CCM_CONTRACT --message "Hello World" --destination mumbai_testnet --amount 3 --json | jq -r '.hash')

echo "CCM TX hash: $CCM_TX"

CCM_CCTX=$(npx hardhat cctx $CCM_TX --json)
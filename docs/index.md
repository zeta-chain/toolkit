---
title: Toolkit
---

# ZetaChain Toolkit

This repository contains a collection of helper contracts, Hardhat tasks, and
utility functions that make it easier to build with ZetaChain.

## Building a dApp on ZetaChain

If you're looking to build a dapp on ZetaChain, we recommend checking out
[the tutorials section](https://www.zetachain.com/docs/developers/tutorials/hello/) in ZetaChain docs.

## Prerequisites

Before getting started, ensure that you have
[Node.js](https://nodejs.org/en/download) and [Yarn](https://yarnpkg.com/)
installed on your system.

## Installation

To install this package in Hardhat project, add it as a development dependency:

```
yarn add --dev @zetachain/toolkit
```

## Installing tasks

To install all the the tasks into a Hardhat template, add the following import
statement to `hardhat.config.js`:

```ts
import "@zetachain/toolkit/tasks";
```

## Importing Helper Functions

```ts
import {
  deployZetaConnectorMock,
  deployZetaEthMock,
  prepareData,
  prepareParams,
  evmSetup,
} from "@zetachain/toolkit/helpers";
```

## Importing Helper Contracts

```solidity
pragma solidity 0.8.7;

import "@zetachain/toolkit/contracts/BytesHelperLib.sol";
import "@zetachain/toolkit/contracts/TestSystemContract.sol";
import "@zetachain/toolkit/contracts/TestZRC20.sol";
import "@zetachain/toolkit/contracts/SwapHelperLib.sol";
import "@zetachain/toolkit/contracts/ZetaConnectorMock.sol";
import "@zetachain/toolkit/contracts/EthZetaMock.sol";
```

## Contributing to the Project

To get started, install the necessary dependencies by running the following
command in your terminal:

```
yarn
```

```
yarn build
```

## Classes

### ZetaChainClient

#### Constructors

##### Constructor

> **new ZetaChainClient**(`params`): [`ZetaChainClient`](toolkit/index.md#zetachainclient)

Initializes ZetaChainClient instance.

```ts
new ZetaChainClient({
  network: "testnet"
})
```

With an Ethers.js wallet:

```ts
const client = new ZetaChainClient({
  network: "testnet",
  wallet: ethers.Wallet.fromMnemonic(process.env.MNEMONIC as string),
});
```

With a signer:

```ts
const client = new ZetaChainClient({
  network: "testnet",
  signer: await ethers.getSigners(),
});
```

Use a custom RPC endpoint for ZetaChain or any connected chain:

```ts
const client = new ZetaChainClient({
  network: "testnet",
  chains: {
    zeta_testnet: {
      api: {
        url: "https://zetachain-testnet-archive.allthatnode.com:8545/${process.env.KEY}",
        type: "evm",
      },
    },
  },
});
```

###### Parameters

###### params

`ZetaChainClientParams`

###### Returns

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

#### Properties

##### chains

> **chains**: `Chains`

##### evmCall()

> **evmCall**: (`this`, `args`) => `Promise`\<`ContractTransactionResponse`\>

**`Function`**

evmCall

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

The instance of the ZetaChain client that contains the signer information.

###### args

The function arguments.

###### gatewayEvm?

`string`

The address of the EVM gateway contract.

###### receiver

`string`

The address of the target contract or account to call on the EVM chain.

###### revertOptions

`RevertOptions`

Options to handle call reversion, including revert address, message, and gas limit for the revert scenario.

###### txOptions

`TxOptions`

Transaction options such as gasLimit, gasPrice, etc.

###### types

`string`[]

JSON string representing the types of the function parameters (e.g., ["uint256", "address"]).

###### values

`ParseAbiValuesReturnType`

The values to be passed to the function (should match the types).

###### Returns

`Promise`\<`ContractTransactionResponse`\>

- Returns the transaction object.

###### Description

Calls a universal app contract on ZetaChain.

##### evmDeposit()

> **evmDeposit**: (`this`, `args`) => `Promise`\<`ContractTransactionResponse`\>

**`Function`**

evmDeposit

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

The instance of the ZetaChain client that contains the signer information.

###### args

The function arguments.

###### amount

`string`

The amount of ERC20 tokens or native currency to deposit.

###### erc20?

`string`

The address of the ERC20 token contract. If depositing native currency (e.g., ETH), this can be left empty or undefined.

###### gatewayEvm?

`string`

The address of the ZetaChain gateway contract on the EVM-compatible blockchain.

###### receiver

`string`

The address of the receiver or target contract for the deposit.

###### revertOptions

`RevertOptions`

Options to handle call reversion, including revert address, message, and gas limit for the revert scenario.

###### txOptions

`TxOptions`

Transaction options, including gasLimit, gasPrice, etc.

###### Returns

`Promise`\<`ContractTransactionResponse`\>

- Returns the transaction object.

###### Description

Deposits a specified amount of ERC-20 or native gas tokens to a receiver on ZetaChain.

##### evmDepositAndCall()

> **evmDepositAndCall**: (`this`, `args`) => `Promise`\<`ContractTransactionResponse`\>

**`Function`**

evmDepositAndCall

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

The instance of the ZetaChain client that contains the signer information.

###### args

The function arguments.

###### amount

`string`

The amount of ERC20 tokens or native currency to deposit.

###### erc20?

`string`

The address of the ERC20 token contract. If depositing native currency (e.g., ETH), this can be left empty or undefined.

###### gatewayEvm?

`string`

The address of the ZetaChain gateway contract on the EVM-compatible blockchain.

###### receiver

`string`

The address of the receiver contract or account where the function call will be executed.

###### revertOptions

`RevertOptions`

Options to handle call reversion, including revert address, message, and gas limit for the revert scenario.

###### txOptions

`TxOptions`

Transaction options, including gasLimit, gasPrice, etc.

###### types

`string`[]

JSON string representing the types of the function parameters (e.g., ["uint256", "address"]).

###### values

`ParseAbiValuesReturnType`

The values to be passed to the function (should match the types).

###### Returns

`Promise`\<`ContractTransactionResponse`\>

- Returns the transaction object.

###### Description

Deposits a specified amount of ERC-20 or native gas tokens and calls a universal app contract on ZetaChain.

##### getBalances()

> **getBalances**: (`this`, `__namedParameters`) => `Promise`\<`TokenBalance`[]\>

Get token balances of all tokens on all chains connected to ZetaChain.

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

ZetaChainClient instance.

###### \_\_namedParameters

###### btcAddress?

`string`

###### evmAddress?

`string`

###### solanaAddress?

`string`

###### suiAddress?

`string`

###### tonAddress?

`string`

###### Returns

`Promise`\<`TokenBalance`[]\>

Array of token balances

##### getChainId()

> **getChainId**: (`this`, `chainNameOrAlias`) => `null` \| `number`

Get chain ID from a chain label.

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

ZetaChainClient instance.

###### chainNameOrAlias

`string`

Chain label like goerli_testnet

###### Returns

`null` \| `number`

##### getEndpoint()

> **getEndpoint**: (`this`, `type`, `network`) => `string`

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

###### type

`string`

###### network

`string`

###### Returns

`string`

##### getFees()

> **getFees**: (`this`, `gas`) => `Promise`\<`Fees`\>

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

###### gas

`number`

###### Returns

`Promise`\<`Fees`\>

##### getForeignCoins()

> **getForeignCoins**: (`this`) => `Promise`\<`ForeignCoin`[]\>

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

###### Returns

`Promise`\<`ForeignCoin`[]\>

##### getPools()

> **getPools**: (`this`) => `Promise`\<`Pool`[]\>

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

###### Returns

`Promise`\<`Pool`[]\>

##### getQuote()

> **getQuote**: (`this`, `inputAmount`, `inputToken`, `outputToken`) => `Promise`\<\{ `amount`: `BigNumberish`; `decimals`: `number`; \}\>

Retrieves a quote for swapping input ZRC20 token to output ZRC20 token.

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

###### inputAmount

`string`

The amount of input ZRC20 token.

###### inputToken

`string`

###### outputToken

`string`

###### Returns

`Promise`\<\{ `amount`: `BigNumberish`; `decimals`: `number`; \}\>

- An object containing the output amount and its decimals.

##### getRefundFee()

> **getRefundFee**: (`this`, `inputZRC20`) => `Promise`\<\{ `amount`: `BigNumberish`; `decimals`: `number`; \}\>

Calculates the refund fee in the input ZRC20 token.

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

###### inputZRC20

`string`

The input ZRC20 token address.

###### Returns

`Promise`\<\{ `amount`: `BigNumberish`; `decimals`: `number`; \}\>

- An object containing the refund fee amount and its decimals.

##### getSupportedChains()

> **getSupportedChains**: (`this`) => `Promise`\<`ObserverSupportedChain`[]\>

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

###### Returns

`Promise`\<`ObserverSupportedChain`[]\>

##### getWithdrawFeeInInputToken()

> **getWithdrawFeeInInputToken**: (`this`, `inputZRC20`, `outputZRC20`) => `Promise`\<\{ `amount`: `BigNumberish`; `decimals`: `number`; \}\>

Calculates the withdraw fee in the input ZRC20 token for a given output ZRC20 token.

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

###### inputZRC20

`string`

The input ZRC20 token address.

###### outputZRC20

`string`

The output ZRC20 token address.

###### Returns

`Promise`\<\{ `amount`: `BigNumberish`; `decimals`: `number`; \}\>

- An object containing the withdraw fee amount and its decimals.

##### getZRC20FromERC20()

> **getZRC20FromERC20**: (`this`, `erc20`) => `Promise`\<`string`\>

Retrieves the ZRC20 contract address for a given ERC20 token.

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

###### erc20

`string`

The ERC20 token address.

###### Returns

`Promise`\<`string`\>

- The ZRC20 contract address.

###### Throws

Will throw an error if the ERC-20 token is not supported.

##### getZRC20GasToken()

> **getZRC20GasToken**: (`this`, `network`) => `Promise`\<`undefined` \| `string`\>

Retrieves the ZRC20 contract address for the gas token of a given network.

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

###### network

`string`

The network name.

###### Returns

`Promise`\<`undefined` \| `string`\>

- The ZRC20 contract address for the gas token.

##### network

> **network**: `string`

##### sendZeta()

> **sendZeta**: (`this`, `options`) => `Promise`\<`ContractTransactionResponse`\>

Initiates a cross-chain transfer of ZETA tokens from the source chain to the
destination chain.

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

ZetaChainClient instance.

###### options

Send ZETA options.

###### amount

`string`

Amount of ZETA tokens to be sent in human readable form.

###### chain

`string`

Source chain label.

###### destination

`string`

Destination chain label.

###### gasLimit?

`number` = `500000`

Optional gas limit on the destination chain.

###### recipient

`string`

Optional recipient address for the token transfer. If not
provided, the token transfer is made to the signer's address.

###### Returns

`Promise`\<`ContractTransactionResponse`\>

A promise that resolves with the transaction details upon success.

##### signer

> **signer**: `undefined` \| `Signer` \| `SignerWithAddress`

##### solanaAdapter

> **solanaAdapter**: `undefined` \| `WalletContextState`

##### solanaDeposit()

> **solanaDeposit**: (`this`, `args`) => `Promise`\<`undefined` \| `string`\>

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

###### args

###### amount

`number`

###### recipient

`string`

###### Returns

`Promise`\<`undefined` \| `string`\>

##### solanaDepositAndCall()

> **solanaDepositAndCall**: (`this`, `args`) => `Promise`\<`undefined` \| `string`\>

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

###### args

###### amount

`number`

###### recipient

`string`

###### types

`string`[]

###### values

`ParseAbiValuesReturnType`

###### Returns

`Promise`\<`undefined` \| `string`\>

##### solanaWallet

> **solanaWallet**: `undefined` \| `Wallet`

##### trackCCTX()

> **trackCCTX**: (`this`, `__namedParameters`) => `Promise`\<`CCTXs`\>

Main entry point for tracking cross-chain transactions

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

###### \_\_namedParameters

###### emitter

`null` \| `Emitter` = `null`

###### hash

`string`

###### json

`boolean` = `false`

###### timeoutSeconds?

`number` = `60`

###### Returns

`Promise`\<`CCTXs`\>

##### wallet

> **wallet**: `undefined` \| `Wallet`

##### zetachainCall()

> **zetachainCall**: (`this`, `args`) => `Promise`\<\{ `gasFee`: `BigNumberish`; `gasZRC20`: `string`; `tx`: `ContractTransactionResponse`; \}\>

**`Function`**

zetachainCall

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

The instance of the ZetaChain client that contains the signer information.

###### args

The function arguments.

###### callOptions

`CallOptions`

Call options.

###### data?

`string`

Optional raw data for non-EVM chains like Solana.

###### function?

`string`

The name of the function to be executed on the target contract.

###### gatewayZetaChain?

`string`

The address of the ZetaChain gateway contract.

###### receiver

`string`

The address or identifier of the contract or account that will receive the call. Can be any string - if not a hex string, it will be converted to a hex representation of its UTF-8 bytes.

###### revertOptions

`RevertOptions`

Options to handle call reversion, including revert address and message.

###### txOptions

`TxOptions`

Transaction options such as gasPrice, nonce, etc.

###### types?

`string`[]

JSON string representing the types of the function parameters (e.g., ["uint256", "address"]).

###### values?

`ParseAbiValuesReturnType`

The values to be passed to the function (should match the types).

###### zrc20

`string`

The address of the ZRC20 token contract used for paying gas fees.

###### Returns

`Promise`\<\{ `gasFee`: `BigNumberish`; `gasZRC20`: `string`; `tx`: `ContractTransactionResponse`; \}\>

- Returns an object containing the transaction, gas token, and gas fee.

###### Description

Calls a contract on a connected chain.

##### zetachainWithdraw()

> **zetachainWithdraw**: (`this`, `args`) => `Promise`\<\{ `gasFee`: `BigNumberish`; `gasZRC20`: `string`; `tx`: `ContractTransactionResponse`; \}\>

**`Function`**

zetachainWithdraw

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

The instance of the ZetaChain client that contains the signer information.

###### args

The function arguments.

###### amount

`string`

The amount of ZRC20 tokens to withdraw.

###### gatewayZetaChain?

`string`

The address of the ZetaChain gateway contract.

###### receiver

`string`

The address that will receive the withdrawn ZRC20 tokens.

###### revertOptions

`RevertOptions`

Options to handle call reversion, including revert address and message.

###### txOptions

`TxOptions`

Transaction options such as gasPrice, nonce, etc.

###### zrc20

`string`

The address of the ZRC20 token contract from which the withdrawal will be made.

###### Returns

`Promise`\<\{ `gasFee`: `BigNumberish`; `gasZRC20`: `string`; `tx`: `ContractTransactionResponse`; \}\>

- Returns an object containing the transaction, gas token, and gas fee.

###### Description

Withdraws a specified amount of ZRC20 tokens from ZetaChain to a connected chain.

##### zetachainWithdrawAndCall()

> **zetachainWithdrawAndCall**: (`this`, `args`) => `Promise`\<\{ `gasFee`: `BigNumberish`; `gasZRC20`: `string`; `tx`: `ContractTransactionResponse`; \}\>

**`Function`**

zetachainWithdrawAndCall

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

The instance of the ZetaChain client that contains the signer information.

###### args

The function arguments.

###### amount

`string`

The amount of ZRC20 tokens to withdraw.

###### callOptions

`CallOptions`

Call options.

###### data?

`string`

Optional raw data for non-EVM chains like Solana.

###### function?

`string`

The name of the function to be called on the target contract.

###### gatewayZetaChain?

`string`

The address of the ZetaChain gateway contract.

###### receiver

`string`

The address that will receive the withdrawn ZRC20 tokens or the contract to interact with.

###### revertOptions

`RevertOptions`

Options to handle call reversion, including revert address and message.

###### txOptions

`TxOptions`

Transaction options such as gasPrice, nonce, etc.

###### types?

`string`[]

JSON string representing the types of the function parameters (e.g., ["uint256", "address"]).

###### values?

`ParseAbiValuesReturnType`

The values to be passed to the function (should match the types).

###### zrc20

`string`

The address of the ZRC20 token contract used for the withdrawal and fee payment.

###### Returns

`Promise`\<\{ `gasFee`: `BigNumberish`; `gasZRC20`: `string`; `tx`: `ContractTransactionResponse`; \}\>

- Returns an object containing the transaction, gas token, and gas fee.

###### Description

Withdraws a specified amount of ZRC20 tokens and makes a function call on the target contract on a connected chain.

#### Methods

##### getChains()

> **getChains**(): `Chains`

###### Returns

`Chains`

##### getGatewayAddress()

> **getGatewayAddress**(): `Promise`\<`string`\>

###### Returns

`Promise`\<`string`\>

##### getSolanaPublicKey()

> **getSolanaPublicKey**(): `null` \| `PublicKey`

###### Returns

`null` \| `PublicKey`

##### isSolanaWalletConnected()

> **isSolanaWalletConnected**(): `boolean`

###### Returns

`boolean`

## Type Aliases

### SupportedArgType

> **SupportedArgType** = `string` \| `bigint` \| `boolean` \| `Uint8Array` \| `BytesLike`

## Functions

### evmCall()

> **evmCall**(`this`, `args`): `Promise`\<`ContractTransactionResponse`\>

evmCall

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

The instance of the ZetaChain client that contains the signer information.

##### args

The function arguments.

###### gatewayEvm?

`string`

The address of the EVM gateway contract.

###### receiver

`string`

The address of the target contract or account to call on the EVM chain.

###### revertOptions

`RevertOptions`

Options to handle call reversion, including revert address, message, and gas limit for the revert scenario.

###### txOptions

`TxOptions`

Transaction options such as gasLimit, gasPrice, etc.

###### types

`string`[]

JSON string representing the types of the function parameters (e.g., ["uint256", "address"]).

###### values

`ParseAbiValuesReturnType`

The values to be passed to the function (should match the types).

#### Returns

`Promise`\<`ContractTransactionResponse`\>

- Returns the transaction object.

#### Description

Calls a universal app contract on ZetaChain.

***

### evmDeposit()

> **evmDeposit**(`this`, `args`): `Promise`\<`ContractTransactionResponse`\>

evmDeposit

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

The instance of the ZetaChain client that contains the signer information.

##### args

The function arguments.

###### amount

`string`

The amount of ERC20 tokens or native currency to deposit.

###### erc20?

`string`

The address of the ERC20 token contract. If depositing native currency (e.g., ETH), this can be left empty or undefined.

###### gatewayEvm?

`string`

The address of the ZetaChain gateway contract on the EVM-compatible blockchain.

###### receiver

`string`

The address of the receiver or target contract for the deposit.

###### revertOptions

`RevertOptions`

Options to handle call reversion, including revert address, message, and gas limit for the revert scenario.

###### txOptions

`TxOptions`

Transaction options, including gasLimit, gasPrice, etc.

#### Returns

`Promise`\<`ContractTransactionResponse`\>

- Returns the transaction object.

#### Description

Deposits a specified amount of ERC-20 or native gas tokens to a receiver on ZetaChain.

***

### evmDepositAndCall()

> **evmDepositAndCall**(`this`, `args`): `Promise`\<`ContractTransactionResponse`\>

evmDepositAndCall

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

The instance of the ZetaChain client that contains the signer information.

##### args

The function arguments.

###### amount

`string`

The amount of ERC20 tokens or native currency to deposit.

###### erc20?

`string`

The address of the ERC20 token contract. If depositing native currency (e.g., ETH), this can be left empty or undefined.

###### gatewayEvm?

`string`

The address of the ZetaChain gateway contract on the EVM-compatible blockchain.

###### receiver

`string`

The address of the receiver contract or account where the function call will be executed.

###### revertOptions

`RevertOptions`

Options to handle call reversion, including revert address, message, and gas limit for the revert scenario.

###### txOptions

`TxOptions`

Transaction options, including gasLimit, gasPrice, etc.

###### types

`string`[]

JSON string representing the types of the function parameters (e.g., ["uint256", "address"]).

###### values

`ParseAbiValuesReturnType`

The values to be passed to the function (should match the types).

#### Returns

`Promise`\<`ContractTransactionResponse`\>

- Returns the transaction object.

#### Description

Deposits a specified amount of ERC-20 or native gas tokens and calls a universal app contract on ZetaChain.

***

### getBalances()

> **getBalances**(`this`, `__namedParameters`): `Promise`\<`TokenBalance`[]\>

Get token balances of all tokens on all chains connected to ZetaChain.

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

ZetaChainClient instance.

##### \_\_namedParameters

###### btcAddress?

`string`

###### evmAddress?

`string`

###### solanaAddress?

`string`

###### suiAddress?

`string`

###### tonAddress?

`string`

#### Returns

`Promise`\<`TokenBalance`[]\>

Array of token balances

***

### getChainId()

> **getChainId**(`this`, `chainNameOrAlias`): `null` \| `number`

Get chain ID from a chain label.

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

ZetaChainClient instance.

##### chainNameOrAlias

`string`

Chain label like goerli_testnet

#### Returns

`null` \| `number`

***

### getEndpoint()

> **getEndpoint**(`this`, `type`, `network`): `string`

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

##### type

`string`

##### network

`string`

#### Returns

`string`

***

### getFees()

> **getFees**(`this`, `gas`): `Promise`\<`Fees`\>

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

##### gas

`number`

#### Returns

`Promise`\<`Fees`\>

***

### getForeignCoins()

> **getForeignCoins**(`this`): `Promise`\<`ForeignCoin`[]\>

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

#### Returns

`Promise`\<`ForeignCoin`[]\>

***

### getPools()

> **getPools**(`this`): `Promise`\<`Pool`[]\>

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

#### Returns

`Promise`\<`Pool`[]\>

***

### getQuote()

> **getQuote**(`this`, `inputAmount`, `inputToken`, `outputToken`): `Promise`\<\{ `amount`: `BigNumberish`; `decimals`: `number`; \}\>

Retrieves a quote for swapping input ZRC20 token to output ZRC20 token.

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

##### inputAmount

`string`

The amount of input ZRC20 token.

##### inputToken

`string`

##### outputToken

`string`

#### Returns

`Promise`\<\{ `amount`: `BigNumberish`; `decimals`: `number`; \}\>

- An object containing the output amount and its decimals.

***

### getRefundFee()

> **getRefundFee**(`this`, `inputZRC20`): `Promise`\<\{ `amount`: `BigNumberish`; `decimals`: `number`; \}\>

Calculates the refund fee in the input ZRC20 token.

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

##### inputZRC20

`string`

The input ZRC20 token address.

#### Returns

`Promise`\<\{ `amount`: `BigNumberish`; `decimals`: `number`; \}\>

- An object containing the refund fee amount and its decimals.

***

### getSupportedChains()

> **getSupportedChains**(`this`): `Promise`\<`ObserverSupportedChain`[]\>

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

#### Returns

`Promise`\<`ObserverSupportedChain`[]\>

***

### getWithdrawFeeInInputToken()

> **getWithdrawFeeInInputToken**(`this`, `inputZRC20`, `outputZRC20`): `Promise`\<\{ `amount`: `BigNumberish`; `decimals`: `number`; \}\>

Calculates the withdraw fee in the input ZRC20 token for a given output ZRC20 token.

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

##### inputZRC20

`string`

The input ZRC20 token address.

##### outputZRC20

`string`

The output ZRC20 token address.

#### Returns

`Promise`\<\{ `amount`: `BigNumberish`; `decimals`: `number`; \}\>

- An object containing the withdraw fee amount and its decimals.

***

### getZRC20FromERC20()

> **getZRC20FromERC20**(`this`, `erc20`): `Promise`\<`string`\>

Retrieves the ZRC20 contract address for a given ERC20 token.

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

##### erc20

`string`

The ERC20 token address.

#### Returns

`Promise`\<`string`\>

- The ZRC20 contract address.

#### Throws

Will throw an error if the ERC-20 token is not supported.

***

### getZRC20GasToken()

> **getZRC20GasToken**(`this`, `network`): `Promise`\<`undefined` \| `string`\>

Retrieves the ZRC20 contract address for the gas token of a given network.

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

##### network

`string`

The network name.

#### Returns

`Promise`\<`undefined` \| `string`\>

- The ZRC20 contract address for the gas token.

***

### prepareData()

> **prepareData**(`contract`, `types`, `args`): `string`

#### Parameters

##### contract

`string`

##### types

`string`[]

##### args

[`SupportedArgType`](toolkit/index.md#supportedargtype)[]

#### Returns

`string`

***

### prepareParams()

> **prepareParams**(`types`, `args`): `string`

#### Parameters

##### types

`string`[]

##### args

[`SupportedArgType`](toolkit/index.md#supportedargtype)[]

#### Returns

`string`

***

### sendZeta()

> **sendZeta**(`this`, `options`): `Promise`\<`ContractTransactionResponse`\>

Initiates a cross-chain transfer of ZETA tokens from the source chain to the
destination chain.

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

ZetaChainClient instance.

##### options

Send ZETA options.

###### amount

`string`

Amount of ZETA tokens to be sent in human readable form.

###### chain

`string`

Source chain label.

###### destination

`string`

Destination chain label.

###### gasLimit?

`number` = `500000`

Optional gas limit on the destination chain.

###### recipient

`string`

Optional recipient address for the token transfer. If not
provided, the token transfer is made to the signer's address.

#### Returns

`Promise`\<`ContractTransactionResponse`\>

A promise that resolves with the transaction details upon success.

***

### solanaDeposit()

> **solanaDeposit**(`this`, `args`): `Promise`\<`undefined` \| `string`\>

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

##### args

###### amount

`number`

###### recipient

`string`

#### Returns

`Promise`\<`undefined` \| `string`\>

***

### solanaDepositAndCall()

> **solanaDepositAndCall**(`this`, `args`): `Promise`\<`undefined` \| `string`\>

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

##### args

###### amount

`number`

###### recipient

`string`

###### types

`string`[]

###### values

`ParseAbiValuesReturnType`

#### Returns

`Promise`\<`undefined` \| `string`\>

***

### trackCCTX()

> **trackCCTX**(`this`, `__namedParameters`): `Promise`\<`CCTXs`\>

Main entry point for tracking cross-chain transactions

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

##### \_\_namedParameters

###### emitter

`null` \| `Emitter` = `null`

###### hash

`string`

###### json

`boolean` = `false`

###### timeoutSeconds?

`number` = `60`

#### Returns

`Promise`\<`CCTXs`\>

***

### zetachainCall()

> **zetachainCall**(`this`, `args`): `Promise`\<\{ `gasFee`: `BigNumberish`; `gasZRC20`: `string`; `tx`: `ContractTransactionResponse`; \}\>

zetachainCall

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

The instance of the ZetaChain client that contains the signer information.

##### args

The function arguments.

###### callOptions

`CallOptions`

Call options.

###### data?

`string`

Optional raw data for non-EVM chains like Solana.

###### function?

`string`

The name of the function to be executed on the target contract.

###### gatewayZetaChain?

`string`

The address of the ZetaChain gateway contract.

###### receiver

`string`

The address or identifier of the contract or account that will receive the call. Can be any string - if not a hex string, it will be converted to a hex representation of its UTF-8 bytes.

###### revertOptions

`RevertOptions`

Options to handle call reversion, including revert address and message.

###### txOptions

`TxOptions`

Transaction options such as gasPrice, nonce, etc.

###### types?

`string`[]

JSON string representing the types of the function parameters (e.g., ["uint256", "address"]).

###### values?

`ParseAbiValuesReturnType`

The values to be passed to the function (should match the types).

###### zrc20

`string`

The address of the ZRC20 token contract used for paying gas fees.

#### Returns

`Promise`\<\{ `gasFee`: `BigNumberish`; `gasZRC20`: `string`; `tx`: `ContractTransactionResponse`; \}\>

- Returns an object containing the transaction, gas token, and gas fee.

#### Description

Calls a contract on a connected chain.

***

### zetachainWithdraw()

> **zetachainWithdraw**(`this`, `args`): `Promise`\<\{ `gasFee`: `BigNumberish`; `gasZRC20`: `string`; `tx`: `ContractTransactionResponse`; \}\>

zetachainWithdraw

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

The instance of the ZetaChain client that contains the signer information.

##### args

The function arguments.

###### amount

`string`

The amount of ZRC20 tokens to withdraw.

###### gatewayZetaChain?

`string`

The address of the ZetaChain gateway contract.

###### receiver

`string`

The address that will receive the withdrawn ZRC20 tokens.

###### revertOptions

`RevertOptions`

Options to handle call reversion, including revert address and message.

###### txOptions

`TxOptions`

Transaction options such as gasPrice, nonce, etc.

###### zrc20

`string`

The address of the ZRC20 token contract from which the withdrawal will be made.

#### Returns

`Promise`\<\{ `gasFee`: `BigNumberish`; `gasZRC20`: `string`; `tx`: `ContractTransactionResponse`; \}\>

- Returns an object containing the transaction, gas token, and gas fee.

#### Description

Withdraws a specified amount of ZRC20 tokens from ZetaChain to a connected chain.

***

### zetachainWithdrawAndCall()

> **zetachainWithdrawAndCall**(`this`, `args`): `Promise`\<\{ `gasFee`: `BigNumberish`; `gasZRC20`: `string`; `tx`: `ContractTransactionResponse`; \}\>

zetachainWithdrawAndCall

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

The instance of the ZetaChain client that contains the signer information.

##### args

The function arguments.

###### amount

`string`

The amount of ZRC20 tokens to withdraw.

###### callOptions

`CallOptions`

Call options.

###### data?

`string`

Optional raw data for non-EVM chains like Solana.

###### function?

`string`

The name of the function to be called on the target contract.

###### gatewayZetaChain?

`string`

The address of the ZetaChain gateway contract.

###### receiver

`string`

The address that will receive the withdrawn ZRC20 tokens or the contract to interact with.

###### revertOptions

`RevertOptions`

Options to handle call reversion, including revert address and message.

###### txOptions

`TxOptions`

Transaction options such as gasPrice, nonce, etc.

###### types?

`string`[]

JSON string representing the types of the function parameters (e.g., ["uint256", "address"]).

###### values?

`ParseAbiValuesReturnType`

The values to be passed to the function (should match the types).

###### zrc20

`string`

The address of the ZRC20 token contract used for the withdrawal and fee payment.

#### Returns

`Promise`\<\{ `gasFee`: `BigNumberish`; `gasZRC20`: `string`; `tx`: `ContractTransactionResponse`; \}\>

- Returns an object containing the transaction, gas token, and gas fee.

#### Description

Withdraws a specified amount of ZRC20 tokens and makes a function call on the target contract on a connected chain.

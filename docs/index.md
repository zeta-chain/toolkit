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

Defined in: [client.ts:94](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L94)

#### Constructors

##### Constructor

> **new ZetaChainClient**(`params`): [`ZetaChainClient`](toolkit/index.md#zetachainclient)

Defined in: [client.ts:148](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L148)

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

Defined in: [client.ts:95](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L95)

##### evmCall()

> **evmCall**: (`this`, `args`) => `Promise`\<`ContractTransactionResponse`\>

Defined in: [client.ts:285](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L285)

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

Defined in: [client.ts:286](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L286)

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

Defined in: [client.ts:284](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L284)

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

Defined in: [client.ts:266](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L266)

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

Defined in: [client.ts:273](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L273)

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

Defined in: [client.ts:265](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L265)

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

Defined in: [client.ts:269](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L269)

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

###### gas

`number`

###### Returns

`Promise`\<`Fees`\>

##### getForeignCoins()

> **getForeignCoins**: (`this`) => `Promise`\<`ForeignCoin`[]\>

Defined in: [client.ts:267](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L267)

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

###### Returns

`Promise`\<`ForeignCoin`[]\>

##### getPools()

> **getPools**: (`this`) => `Promise`\<`Pool`[]\>

Defined in: [client.ts:270](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L270)

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

###### Returns

`Promise`\<`Pool`[]\>

##### getQuote()

> **getQuote**: (`this`, `inputAmount`, `inputToken`, `outputToken`) => `Promise`\<\{ `amount`: `BigNumberish`; `decimals`: `number`; \}\>

Defined in: [client.ts:274](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L274)

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

Defined in: [client.ts:276](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L276)

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

Defined in: [client.ts:268](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L268)

###### Parameters

###### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

###### Returns

`Promise`\<`ObserverSupportedChain`[]\>

##### getWithdrawFeeInInputToken()

> **getWithdrawFeeInInputToken**: (`this`, `inputZRC20`, `outputZRC20`) => `Promise`\<\{ `amount`: `BigNumberish`; `decimals`: `number`; \}\>

Defined in: [client.ts:275](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L275)

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

Defined in: [client.ts:277](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L277)

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

Defined in: [client.ts:278](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L278)

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

Defined in: [client.ts:96](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L96)

##### sendZeta()

> **sendZeta**: (`this`, `options`) => `Promise`\<`ContractTransactionResponse`\>

Defined in: [client.ts:272](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L272)

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

Defined in: [client.ts:98](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L98)

##### solanaAdapter

> **solanaAdapter**: `undefined` \| `WalletContextState`

Defined in: [client.ts:100](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L100)

##### solanaDeposit()

> **solanaDeposit**: (`this`, `args`) => `Promise`\<`undefined` \| `string`\>

Defined in: [client.ts:279](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L279)

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

Defined in: [client.ts:280](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L280)

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

Defined in: [client.ts:99](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L99)

##### trackCCTX()

> **trackCCTX**: (`this`, `__namedParameters`) => `Promise`\<`CCTXs`\>

Defined in: [client.ts:271](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L271)

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

Defined in: [client.ts:97](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L97)

##### zetachainCall()

> **zetachainCall**: (`this`, `args`) => `Promise`\<\{ `gasFee`: `BigNumberish`; `gasZRC20`: `string`; `tx`: `ContractTransactionResponse`; \}\>

Defined in: [client.ts:283](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L283)

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

Defined in: [client.ts:282](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L282)

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

Defined in: [client.ts:281](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L281)

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

Defined in: [client.ts:251](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L251)

###### Returns

`Chains`

##### getGatewayAddress()

> **getGatewayAddress**(): `Promise`\<`string`\>

Defined in: [client.ts:182](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L182)

###### Returns

`Promise`\<`string`\>

##### getSolanaPublicKey()

> **getSolanaPublicKey**(): `null` \| `PublicKey`

Defined in: [client.ts:259](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L259)

###### Returns

`null` \| `PublicKey`

##### isSolanaWalletConnected()

> **isSolanaWalletConnected**(): `boolean`

Defined in: [client.ts:255](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/client.ts#L255)

###### Returns

`boolean`

## Type Aliases

### SupportedArgType

> **SupportedArgType** = `string` \| `bigint` \| `boolean` \| `Uint8Array` \| `BytesLike`

Defined in: [prepareData.ts:3](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/prepareData.ts#L3)

## Functions

### evmCall()

> **evmCall**(`this`, `args`): `Promise`\<`ContractTransactionResponse`\>

Defined in: [evmCall.ts:26](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/evmCall.ts#L26)

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

Defined in: [evmDeposit.ts:33](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/evmDeposit.ts#L33)

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

Defined in: [evmDepositAndCall.ts:36](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/evmDepositAndCall.ts#L36)

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

Defined in: [getBalances.ts:30](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/getBalances.ts#L30)

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

Defined in: [getChainId.ts:12](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/getChainId.ts#L12)

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

Defined in: [getEndpoint.ts:3](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/getEndpoint.ts#L3)

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

Defined in: [getFees.ts:110](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/getFees.ts#L110)

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

Defined in: [getForeignCoins.ts:6](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/getForeignCoins.ts#L6)

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

#### Returns

`Promise`\<`ForeignCoin`[]\>

***

### getPools()

> **getPools**(`this`): `Promise`\<`Pool`[]\>

Defined in: [getPools.ts:12](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/getPools.ts#L12)

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

#### Returns

`Promise`\<`Pool`[]\>

***

### getQuote()

> **getQuote**(`this`, `inputAmount`, `inputToken`, `outputToken`): `Promise`\<\{ `amount`: `BigNumberish`; `decimals`: `number`; \}\>

Defined in: [getQuote.ts:202](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/getQuote.ts#L202)

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

Defined in: [getQuote.ts:106](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/getQuote.ts#L106)

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

Defined in: [getSupportedChains.ts:6](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/getSupportedChains.ts#L6)

#### Parameters

##### this

[`ZetaChainClient`](toolkit/index.md#zetachainclient)

#### Returns

`Promise`\<`ObserverSupportedChain`[]\>

***

### getWithdrawFeeInInputToken()

> **getWithdrawFeeInInputToken**(`this`, `inputZRC20`, `outputZRC20`): `Promise`\<\{ `amount`: `BigNumberish`; `decimals`: `number`; \}\>

Defined in: [getQuote.ts:153](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/getQuote.ts#L153)

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

Defined in: [getQuote.ts:56](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/getQuote.ts#L56)

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

Defined in: [getQuote.ts:73](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/getQuote.ts#L73)

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

Defined in: [prepareData.ts:10](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/prepareData.ts#L10)

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

Defined in: [prepareData.ts:19](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/prepareData.ts#L19)

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

Defined in: [sendZeta.ts:29](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/sendZeta.ts#L29)

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

Defined in: [solanaDeposit.ts:17](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/solanaDeposit.ts#L17)

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

Defined in: [solanaDepositAndCall.ts:18](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/solanaDepositAndCall.ts#L18)

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

Defined in: [trackCCTX.ts:18](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/trackCCTX.ts#L18)

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

Defined in: [zetachainCall.ts:41](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/zetachainCall.ts#L41)

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

Defined in: [zetachainWithdraw.ts:34](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/zetachainWithdraw.ts#L34)

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

Defined in: [zetachainWithdrawAndCall.ts:42](https://github.com/zeta-chain/toolkit/blob/0e54f75f043e6d8de5aee8d9953466badd663a00/packages/client/src/zetachainWithdrawAndCall.ts#L42)

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

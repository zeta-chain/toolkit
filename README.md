# ZetaChain Toolkit

This repository contains a collection of helper contracts, Hardhat tasks, and
utility functions that make it easier to build with ZetaChain.

## Building a dApp on ZetaChain

If you're looking to build a dapp on ZetaChain, we recommend using the Hardhat
[template](https://github.com/zeta-chain/template). This template has all the
toolkit featured imported, so you don't need to install this package manually.

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

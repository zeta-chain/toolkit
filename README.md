# ZetaChain Toolkit

ZetaChain Toolkit is a TypeScript SDK for building universal apps that transfer
tokens, invoke contracts, and track transactions across any chain connected to
ZetaChain.

## ✨ Features

- Cross-chain asset transfers: deposit gas and fungible tokens from any
  supported chain to ZetaChain and withdraw them back.
- Cross-chain contract execution: make incoming calls to universal contracts on
  ZetaChain or trigger outgoing calls to contracts on connected chains.
- Real-time transaction tracking: monitor the full lifecycle of cross-chain
  transactions as they propagate across networks.
- Built-in multi-chain support: works out of the box with EVM chains, Solana,
  Sui, Bitcoin, and TON.

## 📦 Installation

```bash
npm i @zetachain/toolkit
```

## 🚀 Quick start

```ts
import { evmDeposit, zetachainCall } from "@zetachain/toolkit";

// Deposit USDC from Ethereum to ZetaChain
await evmDeposit(
  {
    amount: "1.0",
    receiver: "0xReceiverOnZetaChain", // EOA or contract on ZetaChain
    token: "0xUSDC", // ERC-20 on the origin chain
  },
  { signer: ethersSigner }
);

// Ping a contract on Ethereum from ZetaChain
await zetachainCall(
  {
    receiver: "0xRecevierContract", // contract on a connected chain
    function: "hello(string)",
    types: ["string"],
    values: ["alice"],
    zrc20: "0xZRC20",
  },
  { signer: ethersSigner }
);
```

All Toolkit capabilities are also exposed through [`zetachain`
CLI](https://github.com/zeta-chain/cli).

## 🧑‍💻 Documentation

Full API reference, architecture guides, and recipes live in the [docs
site](docs/index.md).

## 🤝 Contributing

Issues and PRs are welcome! Please read the [contributing
guide](CONTRIBUTING.md) before getting started.

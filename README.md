# ZetaChain Toolkit

ZetaChain Toolkit provides a TypeScript SDK for depositing assets, invoking
contracts, and querying data across every chain connected to ZetaChain.

Currently supports major chains including EVM chains, Solana, Sui, Bitcoin, and
TON.

## ✨ Features

- Asset transfer - deposit from connected chains to ZetaChain and withdraw both
  gas and fungible tokens.
- Cross-chain contract calls - make calls from connected chains to universal
  contracts on ZetaChain and outgoing calls.
- Real‑time transaction tracking — monitor the status of cross‑chain
  transactions as they propagate.

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

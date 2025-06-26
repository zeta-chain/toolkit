# Add foundry test setup 

This version of code demonstrates a temporary setup to test smart contracts that depend on ZetaChain's toolkit.  

## ⚠️ Important Notice

Due to incompatibilities between the **latest version** of `@zetachain/protocol-contracts` and the current examples/standard contracts, we are using version `13.0.0` of the protocol contracts **instead of the latest release**.

Additionally, as mentioned previously, this is a **temporary workaround** while waiting for `FoundrySetup.t.sol` to be merged into the main [`@zetachain/toolkit`](https://github.com/zeta-chain/toolkit) repository.

Therefore, the following dependencies are **temporary** and **should not be considered part of the final version** of the `toolkit` repo.

---

## 🛠️ Setup Instructions

Make sure you have [Foundry](https://book.getfoundry.sh/getting-started/installation) installed.

Then run the following commands:

```bash
# Install JS dependencies
yarn

# Add specific ZetaChain packages
yarn add @zetachain/protocol-contracts@13.0.0
yarn add @zetachain/toolkit
yarn add @zetachain/standard-contracts

# Install Forge standard library
forge install foundry-rs/forge-std

# Build contracts
forge build

# Run tests
forge test


 
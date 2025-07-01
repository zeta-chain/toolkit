// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@zetachain/protocol-contracts/contracts/zevm/ZRC20.sol";

interface IZRC20Mock is IZRC20 {
    function mint(address account, uint256 amount) external;
    function burn(address account, uint256 amount) external;
}

contract ZRC20Mock is ZRC20 {
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 chainid_,
        CoinType coinType_,
        uint256 gasLimit_,
        address systemContractAddress_,
        address gatewayAddress_
    )
        ZRC20(
            name_,
            symbol_,
            decimals_,
            chainid_,
            coinType_,
            gasLimit_,
            systemContractAddress_,
            gatewayAddress_
        )
    {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external {
        _burn(account, amount);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

library Math {
    error AdditionsOverflow();
    error SubtractionsUnderflow();
    error MultiplicationsOverflow();

    function add(uint256 x, uint256 y) internal pure returns (uint256 z) {
        unchecked {
            z = x + y;
            if (z < x) revert AdditionsOverflow();
        }
    }

    function sub(uint256 x, uint256 y) internal pure returns (uint256 z) {
        unchecked {
            if (y > x) revert SubtractionsUnderflow();
            z = x - y;
        }
    }

    function mul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        unchecked {
            if (x == 0 || (z = x * y) / x == y) {
                return z;
            } else {
                revert MultiplicationsOverflow();
            }
        }
    }
}

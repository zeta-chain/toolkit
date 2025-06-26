// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
// solhint-disable no-console
import {MessageContext as EvmMessageContext} from "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";
import {CallOptions, MessageContext as ZetaMessageContext} from "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";
import {GatewayEVM} from "@zetachain/protocol-contracts/contracts/evm/GatewayEVM.sol";
import {GatewayZEVM} from "@zetachain/protocol-contracts/contracts/zevm/GatewayZEVM.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {RevertContext, RevertOptions, AbortContext} from "@zetachain/protocol-contracts/contracts/Revert.sol";
import {IERC20Custody} from "@zetachain/protocol-contracts/contracts/evm/interfaces/IERC20Custody.sol";
import {IZRC20, IZRC20Metadata} from "@zetachain/protocol-contracts/contracts/zevm/interfaces/IZRC20.sol";
import {ZRC20} from "@zetachain/protocol-contracts/contracts/zevm/ZRC20.sol";
import {IUniswapV2Router02} from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "forge-std/Test.sol";
import { console } from "forge-std/console.sol";

contract NodeLogicMock is Test {
    GatewayZEVM public  gatewayZEVM; // using wrapGateway instead
    uint256 public  chainIdZeta;

    // Mapping from chainId to gateway
    mapping(uint256 => GatewayEVM) public gatewayEVMs;  // using wrapGateway instead
    // Mapping from chainId to gasZRC20
    mapping(uint256 => address) public gasZRC20s;
    // Mapping from chainId to assetToZRC20 mapping
    mapping(uint256 => mapping(address => address)) public erc20ToZRC20s; // if asset is address(0), it will be native token
    mapping(uint256 => mapping(address => address)) public zrc20ToErc20s;
    // Uniswap router on ZetaChain
    address public uniswapRouter;
    // WZETA on ZetaChain
    address public wzeta;

    function setGatewayZEVM(address _gatewayZEVM) external {
        gatewayZEVM = GatewayZEVM(payable(_gatewayZEVM));
    }

    function setChainIdZeta(uint256 _chainIdZeta) external {
        chainIdZeta = _chainIdZeta;
    }

    function setGatewayEVM(uint256 chainId, address gatewayEVM) external {
        gatewayEVMs[chainId] = GatewayEVM(payable(gatewayEVM));
    }

    function setGasZRC20(uint256 chainId, address gasZRC20) external {
        gasZRC20s[chainId] = gasZRC20;
    }

    function setAssetToZRC20(uint256 chainId, address asset, address zrc20) external {
        erc20ToZRC20s[chainId][asset] = zrc20;
    }

    function setZRC20ToAsset(uint256 chainId, address zrc20, address asset) external {
        zrc20ToErc20s[chainId][zrc20] = asset;
    }

    function setUniswapRouter(address _uniswapRouter) external {
        uniswapRouter = _uniswapRouter;
    }

    function setWZETA(address _wzeta) external {
        wzeta = _wzeta;
    }

    // EVM Chain Handlers
    function handleEVMDeposit(
        uint256 chainId,
        address sender,
        address receiver,
        uint256 amount,
        address asset,
        RevertOptions calldata revertOptions
    ) external {
        // Get ZRC20 address for the asset
        address zrc20 = erc20ToZRC20s[chainId][asset];
        if (zrc20 == address(0)) {
            console.log(
                string.concat(
                    "[chainId ",
                    vm.toString(chainIdZeta),
                    "] [ERROR] ZRC20 not found for asset: ",
                    vm.toString(asset)
                )
            );
            return;
        }

        // Prank as protocol to call zetachain gateway
        vm.prank(gatewayZEVM.PROTOCOL_ADDRESS());
        try gatewayZEVM.deposit(
            zrc20,
            amount,
            receiver
        ) {
            console.log(
                string.concat(
                    "[chainId ",
                    vm.toString(chainIdZeta),
                    "] [INFO] ZetaChain deposit completed successfully"
                )
            );
        } catch (bytes memory err) {
            _handleEVMDepositError(chainId, sender, zrc20, amount, asset, revertOptions, err, false);
        }
    }

    function handleEVMDepositAndCall(
        uint256 chainId,
        address sender,
        address receiver,
        uint256 amount,
        address asset,
        bytes calldata payload,
        RevertOptions calldata revertOptions
    ) external {
        // Get ZRC20 address for the asset
        address zrc20 = erc20ToZRC20s[chainId][asset];
        if (zrc20 == address(0)) {
            console.log(
                string.concat(
                    "[chainId ",
                    vm.toString(chainIdZeta),
                    "] [ERROR] ZRC20 not found for asset: ",
                    vm.toString(asset)
                )
            );
            return;
        }

        // Prank as protocol to call zetachain gateway
        vm.prank(gatewayZEVM.PROTOCOL_ADDRESS());
        try gatewayZEVM.depositAndCall{gas:1500000}(
            ZetaMessageContext({
                sender: abi.encodePacked(sender),
                senderEVM: sender,
                chainID: chainId
            }),
            zrc20,
            amount,
            receiver,
            payload
        ) {
            console.log(
                string.concat(
                    "[chainId ",
                    vm.toString(chainIdZeta),
                    "] [INFO] ZetaChain deposit and call completed successfully"
                )
            );
        } catch (bytes memory err) {
            _handleEVMDepositError(
                chainId,
                sender,
                zrc20,
                amount,
                asset,
                revertOptions,
                err,
                true
            );
        }
    }

    function handleEVMCall(
        uint256 chainId,
        address sender,
        address receiver,
        bytes calldata payload,
        RevertOptions calldata revertOptions
    ) external {
        // Prank as protocol to call zetachain gateway
        vm.prank(gatewayZEVM.PROTOCOL_ADDRESS());
        try gatewayZEVM.execute{gas:1500000}(
            ZetaMessageContext({
                sender: abi.encodePacked(sender),
                senderEVM: sender,
                chainID: chainId
            }),
            gasZRC20s[chainId],
            0,
            receiver,
            payload
        ) {
            console.log(
                string.concat(
                    "[chainId ",
                    vm.toString(chainIdZeta),
                    "] [INFO] ZetaChain execution completed successfully"
                )
            );
        } catch (bytes memory err) {
            console.log(
                string.concat(
                    "[chainId ",
                    vm.toString(chainIdZeta),
                    "] [ERROR] ZetaChain execution failed: ",
                    string(err)
                )
            );
            _handleZEVMAbort(
                revertOptions.abortAddress,
                0,
                address(0),
                chainId,
                err,
                false,
                sender
            );
        }
    }

    // ZEVM Chain Handlers
    struct ZEVMWithdrawVars {
        uint256 targetChainId;
        GatewayEVM gatewayEVM;
        bool isGasToken;
        address receiverAddress;
        address custody;
        bool custodyNotFound;
        bool success;
        bytes err;
    }
    function handleZEVMWithdraw(
        address sender,
        bytes memory receiver,
        uint256 amount,
        address zrc20,
        RevertOptions calldata revertOptions
    ) external {
        ZEVMWithdrawVars memory vars;
        vars.targetChainId = ZRC20(zrc20).CHAIN_ID();
        vars.gatewayEVM = gatewayEVMs[vars.targetChainId];
        if (address(vars.gatewayEVM) == address(0)) {
            console.log(
                string.concat(
                    "[chainId ",
                    vm.toString(vars.targetChainId),
                    "] [ERROR] Gateway not found"
                )
            );
            return;
        }
        vars.isGasToken = zrc20 == gasZRC20s[vars.targetChainId];
        // vars.receiverAddress = abi.decode(receiver, (address));
        vars.receiverAddress = address(bytes20(receiver));
        if (vars.isGasToken) {
            vm.prank(vars.gatewayEVM.tssAddress());
            (vars.success, ) = vars.receiverAddress.call{value: amount}("");
            if (vars.success) {
                console.log(
                    string.concat(
                        "[chainId ",
                        vm.toString(vars.targetChainId),
                        "] [INFO] Gas token transfer completed successfully"
                    )
                );
            } else {
                console.log(
                    string.concat(
                        "[chainId ",
                        vm.toString(vars.targetChainId),
                        "] [ERROR] Gas token transfer failed"
                    )
                );
                _handleZEVMOnRevert(
                    revertOptions,
                    zrc20,
                    amount,
                    vars.targetChainId,
                    sender
                );
            }
        } else {
            vars.custody = vars.gatewayEVM.custody();
            vars.custodyNotFound = vars.custody == address(0);
            if (vars.custodyNotFound) {
                console.log(
                    string.concat(
                        "[chainId ",
                        vm.toString(vars.targetChainId),
                        "] [ERROR] Custody not found"
                    )
                );
                return;
            }
            vm.prank(vars.gatewayEVM.tssAddress());
            try IERC20Custody(vars.custody).withdraw(
                vars.receiverAddress,
                zrc20ToErc20s[vars.targetChainId][zrc20],
                amount
            ) {
                vars.success = true;
                console.log(
                    string.concat(
                        "[chainId ",
                        vm.toString(vars.targetChainId),
                        "] [INFO] ERC20/ZETA withdraw completed successfully"
                    )
                );
            } catch (bytes memory err) {
                vars.success = false;
                vars.err = err;
                console.log(
                    string.concat(
                        "[chainId ",
                        vm.toString(vars.targetChainId),
                        "] [ERROR] ERC20/ZETA withdraw failed: ",
                        string(err)
                    )
                );
                _handleZEVMOnRevert(
                    revertOptions,
                    zrc20,
                    amount,
                    vars.targetChainId,
                    sender
                );
            }
        }
    }

    struct ZEVMWithdrawAndCallVars {
        uint256 targetChainId;
        GatewayEVM gatewayEVM;
        bool isGasToken;
        address receiverAddress;
        address custody;
        bool custodyNotFound;
        bool selectorMissing;
        string errMsg;
        bool success;
        bytes err;
    }
    function handleZEVMWithdrawAndCall(
        address sender,
        bytes memory receiver,
        uint256 amount,
        address zrc20,
        bytes calldata message,
        CallOptions calldata callOptions,
        RevertOptions calldata revertOptions
    ) external {
        ZEVMWithdrawAndCallVars memory vars;
        vars.targetChainId = ZRC20(zrc20).CHAIN_ID();
        vars.gatewayEVM = gatewayEVMs[vars.targetChainId];
        if (address(vars.gatewayEVM) == address(0)) {
            console.log(
                string.concat(
                    "[chainId ",
                    vm.toString(vars.targetChainId),
                    "] [ERROR] Gateway not found"
                )
            );
            return;
        }
        vars.isGasToken = zrc20 == gasZRC20s[vars.targetChainId];
        // vars.receiverAddress = abi.decode(receiver, (address));
        vars.receiverAddress = address(bytes20(receiver));
        if (vars.isGasToken) {
            if (callOptions.isArbitraryCall) {
                bytes4 selector = bytes4(message[0:4]);
                bytes memory code = getRuntimeCode(vars.receiverAddress);
                if (!contains(code, selector)) {
                    vars.selectorMissing = true;
                    vars.errMsg = string.concat(
                        "Receiver contract does not contain function with selector ",
                        vm.toString(selector)
                    );
                    console.log(
                        string.concat(
                            "[chainId ",
                            vm.toString(vars.targetChainId),
                            "] [ERROR] ",
                            vars.errMsg
                        )
                    );
                    _handleZEVMOnRevert(
                        revertOptions,
                        zrc20,
                        amount,
                        vars.targetChainId,
                        sender
                    );
                    return;
                }
            }
            vm.prank(vars.gatewayEVM.tssAddress());
            try vars.gatewayEVM.execute{gas: callOptions.gasLimit, value: amount}(
                EvmMessageContext({ sender: sender }),
                vars.receiverAddress,
                message
            ) {
                vars.success = true;
                console.log(
                    string.concat(
                        "[chainId ",
                        vm.toString(vars.targetChainId),
                        "] [INFO] Gas token transfer and call completed successfully"
                    )
                );
            } catch (bytes memory err) {
                vars.success = false;
                vars.err = err;
                console.log(
                    string.concat(
                        "[chainId ",
                        vm.toString(vars.targetChainId),
                        "] [ERROR] Gas token transfer and call failed: ",
                        string(err)
                    )
                );
                _handleZEVMOnRevert(
                    revertOptions,
                    zrc20,
                    amount,
                    vars.targetChainId,
                    sender
                );
            }
            
        } else {
            vars.custody = vars.gatewayEVM.custody();
            vars.custodyNotFound = vars.custody == address(0);
            if (vars.custodyNotFound) {
                console.log(
                    string.concat(
                        "[chainId ",
                        vm.toString(vars.targetChainId),
                        "] [ERROR] Custody not found"
                    )
                );
                return;
            }
            vm.prank(vars.gatewayEVM.tssAddress());
            try IERC20Custody(vars.custody).withdrawAndCall{gas:callOptions.gasLimit}(
                EvmMessageContext({ sender: callOptions.isArbitraryCall ? address(0) : sender }),
                vars.receiverAddress,
                zrc20ToErc20s[vars.targetChainId][zrc20],
                amount,
                message
            ) {
                vars.success = true;
                console.log(
                    string.concat(
                        "[chainId ",
                        vm.toString(vars.targetChainId),
                        "] [INFO] ERC20/ZETA withdraw and call completed successfully"
                    )
                );
            } catch (bytes memory err) {
                vars.success = false;
                vars.err = err;
                console.log(
                    string.concat(
                        "[chainId ",
                        vm.toString(vars.targetChainId),
                        "] [ERROR] ERC20/ZETA withdraw and call failed: ",
                        string(err)
                    )
                );
                _handleZEVMOnRevert(
                    revertOptions,
                    zrc20,
                    amount,
                    vars.targetChainId,
                    sender
                );
            }
        }
    }

    struct ZEVMCallVars {
        uint256 targetChainId;
        GatewayEVM gatewayEVM;
        address receiverAddress;
        bool selectorMissing;
        string errMsg;
        bool success;
        bytes err;
    }
    function handleZEVMCall(
        address sender,
        bytes memory receiver,
        address zrc20,
        bytes calldata message,
        CallOptions calldata callOptions,
        RevertOptions calldata revertOptions
    ) external {
        ZEVMCallVars memory vars;
        vars.targetChainId = ZRC20(zrc20).CHAIN_ID();
        vars.gatewayEVM = gatewayEVMs[vars.targetChainId];
        if (address(vars.gatewayEVM) == address(0)) {
            console.log(
                string.concat(
                    "[chainId ",
                    vm.toString(vars.targetChainId),
                    "] [ERROR] Gateway not found"
                )
            );
            return;
        }
        vars.receiverAddress = address(bytes20(receiver));
        console.log("vars.receiverAddress", vars.receiverAddress);
        if (callOptions.isArbitraryCall) {
            bytes4 selector = bytes4(message[0:4]);
            bytes memory code = getRuntimeCode(vars.receiverAddress);
            if (!contains(code, selector)) {
                vars.selectorMissing = true;
                vars.errMsg = string.concat(
                    "Receiver contract does not contain function with selector ",
                    vm.toString(selector)
                );
                console.log(
                    string.concat(
                        "[chainId ",
                        vm.toString(vars.targetChainId),
                        "] [ERROR] ",
                        vars.errMsg
                    )
                );
                _handleZEVMOnRevert(
                    revertOptions,
                    address(0),
                    0,
                    vars.targetChainId,
                    sender
                );
                return;
            }
        }
        vm.prank(vars.gatewayEVM.tssAddress());
        try vars.gatewayEVM.execute{gas:callOptions.gasLimit, value:0}(
            EvmMessageContext({ sender: callOptions.isArbitraryCall ? address(0) : sender }),
            vars.receiverAddress,
            message
        ) {
            vars.success = true;
            console.log(
                string.concat(
                    "[chainId ",
                    vm.toString(vars.targetChainId),
                    "] [INFO] EVM execution completed successfully"
                )
            );
        } catch (bytes memory err) {
            vars.success = false;
            vars.err = err;
            console.log(
                string.concat(
                    "[chainId ",
                    vm.toString(vars.targetChainId),
                    "] [ERROR] EVM execution failed: ",
                    string(err)
                )
            );
            _handleZEVMOnRevert(
                revertOptions,
                address(0),
                0,
                vars.targetChainId,
                sender
            );
        }
    }
    


    // Helper functions

    function getRuntimeCode(address addr) public view returns (bytes memory code) {
    uint256 size;
    assembly {
        size := extcodesize(addr)
    }
    code = new bytes(size);
    assembly {
        extcodecopy(addr, add(code, 0x20), 0, size)
    }
}

    function contains(bytes memory code, bytes4 selector) internal pure returns (bool) {
    for (uint i = 0; i + 4 <= code.length; i++) {
        bytes4 current;
        assembly {
            current := mload(add(add(code, 0x20), i))
        }
        if (current == selector) {
            return true;
        }
    }
    return false;
}

    function getAmounts(
        string memory direction,
        uint256 amount,
        address tokenA,
        address tokenB
    ) private view returns (uint256[] memory) {
        address[] memory path = new address[](2);
        path[0] = tokenA;
        path[1] = tokenB;
        
        if (keccak256(bytes(direction)) == keccak256(bytes("in"))) {
            return IUniswapV2Router02(uniswapRouter).getAmountsIn(amount, path);
        } else {
            return IUniswapV2Router02(uniswapRouter).getAmountsOut(amount, path);
        }
    }

    function swapToCoverGas(
        address zrc20,
        address gasZRC20Addr,
        uint256 gasFee,
        uint256 amount,
        address fungibleModule
    ) private returns (uint256) {
        require(uniswapRouter != address(0), "Uniswap router not set");
        require(wzeta != address(0), "WZETA not set");

        // Approve router to spend ZRC20
        IERC20(zrc20).approve(uniswapRouter, amount);

        // Set up swap path: ZRC20 -> WZETA -> gasZRC20
        address[] memory path = new address[](3);
        path[0] = zrc20;
        path[1] = wzeta;
        path[2] = gasZRC20Addr;

        // Set deadline 20 minutes from now
        uint256 deadline = block.timestamp + 20 minutes;
        console.log("gasFee", gasFee);
        try IUniswapV2Router02(uniswapRouter).swapTokensForExactTokens(
            gasFee,
            amount,
            path,
            fungibleModule,
            deadline
        ) {//returns (uint[] memory swapAmounts) {
            // After successful swap, calculate actual amounts used
            uint256[] memory amountsInZeta = getAmounts(
                "in",
                gasFee,
                wzeta,
                gasZRC20Addr
            );
            
            if (amountsInZeta.length == 0) {
                return amount;
            }

            uint256[] memory amountsInZRC20 = getAmounts(
                "in",
                amountsInZeta[0],
                zrc20,
                wzeta
            );

            if (amountsInZRC20.length == 0) {
                return amount;
            }

            console.log(
                string.concat(
                    "[chainId ",
                    vm.toString(chainIdZeta),
                    "] [INFO] Swap successful: ",
                    vm.toString(amountsInZRC20[0]),
                    " ",
                    IZRC20Metadata(zrc20).name(),
                    " needed"
                )
            );

            return amountsInZRC20[0];
        } catch (bytes memory err) {
            console.log(
                string.concat(
                    "[chainId ",
                    vm.toString(chainIdZeta),
                    "] [ERROR] Uniswap swap failed: ",
                    string(err)
                )
            );
            return amount;
        }
    }

    // EVM Error Handlers
    struct EVMDepositErrorVars {
        string errorType;
        address gasZRC20Addr;
        uint256 gasFee;
        bool mintSuccess;
        uint256 revertAmount;
        uint256 revertGasFee;
        bool isGas;
        bool burnSuccess;
    }
    function _handleEVMDepositError(
        uint256 chainId,
        address sender,
        address zrc20,
        uint256 amount,
        address asset,
        RevertOptions calldata revertOptions,
        bytes memory err,
        bool hasCall
    ) private {
        EVMDepositErrorVars memory vars;
        vars.errorType = hasCall ? "deposit and call" : "deposit";
        console.log(
            string.concat(
                "[chainId ",
                vm.toString(chainIdZeta),
                "] [ERROR] ZetaChain ",
                vars.errorType,
                " failed: ",
                string(err)
            )
        );
        (vars.gasZRC20Addr, vars.gasFee) = IZRC20(zrc20).withdrawGasFeeWithGasLimit(
            revertOptions.onRevertGasLimit
        );
        address protocol = gatewayZEVM.PROTOCOL_ADDRESS();
        vm.prank(protocol);
        vars.mintSuccess = IZRC20(zrc20).deposit(protocol, amount);
        vm.startPrank(protocol);
        if (!vars.mintSuccess) {
            console.log(
                string.concat(
                    "[chainId ",
                    vm.toString(chainIdZeta),
                    "] [ERROR] Failed to mint ZRC20 tokens for protocol address"
                )
            );
            return;
        }
        vars.revertGasFee = vars.gasFee;
        vars.isGas = true;
        if (zrc20 != vars.gasZRC20Addr) {
            vars.isGas = false;
            vars.revertGasFee = swapToCoverGas(
                zrc20,
                vars.gasZRC20Addr,
                vars.gasFee,
                amount,
                gatewayZEVM.PROTOCOL_ADDRESS()
            );
        }
        vm.stopPrank();
        vars.revertAmount = amount - vars.revertGasFee;
        if (vars.revertAmount > 0) {
            vm.prank(gatewayZEVM.PROTOCOL_ADDRESS());
            vars.burnSuccess = IZRC20(zrc20).burn(vars.revertAmount);
            if (!vars.burnSuccess) {
                console.log(
                    string.concat(
                        "[chainId ",
                        vm.toString(chainIdZeta),
                        "] [ERROR] Failed to burn remaining ZRC20 tokens"
                    )
                );
                return;
            }
            _handleEVMOnRevert(
                chainId,
                revertOptions,
                asset,
                vars.revertAmount,
                vars.isGas,
                sender
            );
        } else {
            _handleZEVMAbort(
                revertOptions.abortAddress, 
                amount,
                zrc20,
                chainId,
                err,
                false,
                sender
            );
        }
    }

    function _handleEVMOnRevert(
        uint256 chainId,
        RevertOptions memory revertOptions,
        address asset,
        uint256 amount,
        bool isGas,
        address sender
    ) private {
        RevertContext memory revertContext = RevertContext({
            amount: amount,
            asset: asset,
            revertMessage: revertOptions.revertMessage,
            sender: sender
        });
      
        if (revertOptions.callOnRevert) {
            vm.recordLogs();
            console.log(
                string.concat(
                    "[chainId ",
                    vm.toString(chainId),
                    "] [INFO] Executing onRevert on revertAddress ",
                    vm.toString(revertOptions.revertAddress),
                    ", context: ",
                    vm.toString(abi.encode(revertContext))
                )
            );
            vm.startPrank(gatewayEVMs[chainId].tssAddress());
            if (isGas) {
                gatewayEVMs[chainId].executeRevert{
                    value: amount,
                    gas: revertOptions.onRevertGasLimit
                }(
                    revertOptions.revertAddress,
                    "",  // empty bytes for data
                    revertContext
                );
            } else {
                IERC20Custody(gatewayEVMs[chainId].custody()).withdrawAndRevert{
                    gas: revertOptions.onRevertGasLimit
                }(
                    revertOptions.revertAddress,
                    asset,
                    amount,
                    "",  // empty bytes for data
                    revertContext
                );
            }
            vm.stopPrank();
            // Log events from onRevert
            Vm.Log[] memory entries = vm.getRecordedLogs();
            for(uint i = 0; i < entries.length; i++) {
                if(entries[i].emitter == revertOptions.revertAddress) {
                    console.log(
                        string.concat(
                            "[chainId ",
                            vm.toString(chainId),
                            "] [INFO] Event from onRevert:"
                        )
                    );
                    console.log("  emitter:", vm.toString(entries[i].emitter));
                    console.log("  data:", vm.toString(entries[i].data));
                    for (uint j = 0; j < entries[i].topics.length; j++) {
                        console.log("  topic", j, ":", vm.toString(entries[i].topics[j]));
                    }
                }
            }
        } else {
            console.log(
                string.concat(
                    "[chainId ",
                    vm.toString(chainId),
                    "] [INFO] callOnRevert is false"
                )
            );
            address revertReceiver = revertOptions.revertAddress;
            if (revertOptions.revertAddress == address(0)) {
                console.log(
                    string.concat(
                        "[chainId ",
                        vm.toString(chainId),
                        "] [ERROR] revertAddress is zero, transferring ",
                        vm.toString(amount),
                        " of ",
                        isGas ? "gas" : vm.toString(asset),
                        " tokens to sender ",
                        vm.toString(sender)
                    )
                );
                revertReceiver = sender;
            }

            // Prank as TSS for transfers
            vm.prank(gatewayEVMs[chainId].tssAddress());
            if (isGas) {
                (bool success,) = revertReceiver.call{value: amount}("");
                require(success, "Transfer failed");
            } else {
                IERC20(asset).transfer(revertReceiver, amount);
            }
        }
    }

    // ZEVM Error Handlers
    function _handleZEVMOnRevert(
        RevertOptions memory revertOptions,
        address asset,
        uint256 amount,
        uint256 chainID,
        address sender
    ) private {
        RevertContext memory revertContext = RevertContext({
            amount: amount,
            asset: asset,
            revertMessage: revertOptions.revertMessage,
            sender: sender
        });

        if (revertOptions.callOnRevert) {
            vm.recordLogs();
            if (revertOptions.revertAddress == address(0)) {
                console.log(
                    string.concat(
                        "[chainId ",
                        vm.toString(chainIdZeta),
                        "] [ERROR] revertAddress is zero"
                    )
                );
                 _handleZEVMAbort(
                        revertOptions.abortAddress,
                        amount,
                        asset,
                        chainID,
                        revertOptions.revertMessage,
                        true,
                        sender
                    );
                    return;
                }

            console.log(
                string.concat(
                    "[chainId ",
                    vm.toString(chainID),
                    "] [INFO] Executing onRevert on revertAddress ",
                    vm.toString(revertOptions.revertAddress),
                    ", context: ",
                    vm.toString(abi.encode(revertContext))
                )
            );
            vm.prank(gatewayZEVM.PROTOCOL_ADDRESS());
            if (asset == address(0)) {
                
                
                try gatewayZEVM.executeRevert{gas:1500000}(
                    revertOptions.revertAddress,
                    revertContext
                ) {
                    // Success case
                } catch {
                    _handleZEVMAbort(
                        revertOptions.abortAddress,
                        amount,
                        asset,
                        chainID,
                        revertOptions.revertMessage,
                        true,
                        sender
                    );
                    return;
                }
            } else {
                // For other tokens, use depositAndRevert
                try gatewayZEVM.depositAndRevert{gas:1500000}(
                    asset,
                    amount,
                    revertOptions.revertAddress,
                    revertContext
                ) {
                    // Success case
                } catch {
                    _handleZEVMAbort(
                        revertOptions.abortAddress,
                        amount,
                        asset,
                        chainID,
                        revertOptions.revertMessage,
                        true,
                        sender
                    );
                    return;
                }
            }

            // Log events from onRevert
            Vm.Log[] memory entries = vm.getRecordedLogs();
            for(uint i = 0; i < entries.length; i++) {
                if(entries[i].emitter == revertOptions.abortAddress) {
                    console.log(
                        string.concat(
                            "[chainId ",
                            vm.toString(chainID),
                            "] [INFO] Event from onRevert:"
                        )
                    );
                    console.log("  emitter:", vm.toString(entries[i].emitter));
                    console.log("  data:", vm.toString(entries[i].data));
                    for (uint j = 0; j < entries[i].topics.length; j++) {
                        console.log("  topic", j, ":", vm.toString(entries[i].topics[j]));
                    }
                }
            }
        } else {
            console.log(
                string.concat(
                    "[chainId ",
                    vm.toString(chainID),
                    "] [INFO] callOnRevert is false"
                )
            );

            // If callOnRevert is false, directly call onAbort
            // _handleZEVMOnRevert is only called for outgoing transactions from ZetaChain
            // so outgoing is always true
            _handleZEVMAbort(
                revertOptions.abortAddress,
                amount,
                asset,
                chainID,
                revertOptions.revertMessage,
                true, // outgoing
                sender
            );
        }
    }

    function _handleZEVMAbort(
        address abortAddress,
        uint256 amount,
        address asset,
        uint256 chainID,
        bytes memory revertMessage,
        bool outgoing,
        address sender
    ) private {
        if (abortAddress == address(0)) {
            console.log(string.concat("[chainId ", vm.toString(chainIdZeta), "] [ERROR] abortAddress is zero"));
            if (asset != address(0) && amount > 0) {
                console.log(
                    string.concat(
                        "[chainId ",
                        vm.toString(chainIdZeta),
                        "] [ERROR] Transferring ",
                        vm.toString(amount),
                        " of ",
                        vm.toString(asset),
                        " tokens to sender ",
                        vm.toString(sender)
                    )
                );
                address protocol = gatewayZEVM.PROTOCOL_ADDRESS();
                vm.prank(protocol);
                IZRC20(asset).deposit(protocol, amount);
                vm.prank(protocol);
                IZRC20(asset).transfer(sender, amount); // revert if failed
            } else {
                revert(
                    string.concat(
                        "Can't transfer ",
                        vm.toString(amount),
                        " of ",
                        vm.toString(asset),
                        " tokens"
                    )
                );
            }
            return;
        }

        console.log(
            string.concat(
                "[chainId ",
                vm.toString(chainIdZeta),
                "] [INFO] Transferring tokens to abortAddress ",
                vm.toString(abortAddress)
            )
        );
        if (asset != address(0) && amount > 0) {
            address protocol = gatewayZEVM.PROTOCOL_ADDRESS();
            vm.prank(protocol);
            IZRC20(asset).deposit(protocol, amount);
            vm.prank(protocol);
            IZRC20(asset).transfer(abortAddress, amount); // revert if failed;
        }
        
        AbortContext memory abortContext = AbortContext({
            sender: abi.encode(sender),
            asset: asset,
            amount: amount,
            outgoing: outgoing,
            chainID: chainID,
            revertMessage: revertMessage
        });
        
        console.log(
            string.concat(
                "[chainId ",
                vm.toString(chainIdZeta),
                "] [INFO] Contract ",
                vm.toString(abortAddress),
                " executing onAbort, context: ",
                vm.toString(abi.encode(abortContext))
            )
        );
        vm.prank(gatewayZEVM.PROTOCOL_ADDRESS());
        vm.recordLogs();
        try gatewayZEVM.executeAbort(abortAddress, abortContext) {
            // Log all events emitted from onAbort, filtered by abortAddress
            Vm.Log[] memory entries = vm.getRecordedLogs();
            for(uint256 i = 0; i < entries.length; i++) {
                // Only log events from the abort contract
                if(entries[i].emitter == abortAddress) {
                    console.log(
                        string.concat(
                            "[chainId ",
                            vm.toString(chainIdZeta),
                            "] [INFO] Event from onAbort:"
                        )
                    );
                    console.log("  emitter:", vm.toString(entries[i].emitter));
                    console.log("  data:", vm.toString(entries[i].data));
                    for (uint j = 0; j < entries[i].topics.length; j++) {
                        console.log("  topic", j, ":", vm.toString(entries[i].topics[j]));
                    }
                }
            }
        } catch (bytes memory abortErr) {
            console.log(
                string.concat(
                    "[chainId ",
                    vm.toString(chainIdZeta),
                    "] [ERROR] onAbort failed: ",
                    string(abortErr)
                )
            );
        }
    }
} 

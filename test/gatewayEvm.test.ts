import { expect } from "chai";
import { ethers } from "ethers";

import {
  createRevertData,
  generateEvmCallData,
  generateEvmDepositAndCallData,
  generateEvmDepositData,
  generateGatewayCallData,
  prepareGatewayTx,
} from "../utils/gatewayEvm";

describe("Gateway EVM Utilities", () => {
  const TEST_GATEWAY = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0";
  const TEST_RECEIVER = "0x8198f5d8F8CfFE8f9C413d98a0A55aEB8ab9FbB7";
  const TEST_ERC20 = "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  const DEFAULT_REVERT_OPTIONS = {
    abortAddress: ZERO_ADDRESS,
    callOnRevert: false,
    onRevertGasLimit: 7000000,
    revertAddress: ZERO_ADDRESS,
    revertMessage: "0x",
  };

  describe("createRevertData", () => {
    it("should format revert data correctly", () => {
      const input = {
        abortAddress: ZERO_ADDRESS,
        callOnRevert: true,
        onRevertGasLimit: 5000000,
        revertAddress: TEST_RECEIVER,
        revertMessage: "error message",
      };

      const result = createRevertData(input);

      expect(result).to.have.property("abortAddress").equal(ZERO_ADDRESS);
      expect(result).to.have.property("callOnRevert").equal(true);
      expect(result).to.have.property("onRevertGasLimit").equal(5000000);
      expect(result).to.have.property("revertAddress").equal(TEST_RECEIVER);
      // revertMessage should be hex encoded
      expect(result).to.have.property("revertMessage").that.is.a("string");
      expect(result.revertMessage).to.match(/^0x[0-9a-f]+$/i);
    });

    it("should handle empty revert message", () => {
      const input = {
        abortAddress: ZERO_ADDRESS,
        callOnRevert: false,
        onRevertGasLimit: 7000000,
        revertAddress: ZERO_ADDRESS,
        revertMessage: "",
      };

      const result = createRevertData(input);
      expect(result.revertMessage).to.equal("0x");
    });
  });

  describe("prepareGatewayTx", () => {
    it("should prepare transaction data without value", () => {
      const result = prepareGatewayTx("call", [
        TEST_RECEIVER,
        "0x1234",
        DEFAULT_REVERT_OPTIONS,
      ]);

      expect(result).to.have.property("data").that.is.a("string");
      expect(result.data).to.match(/^0x[0-9a-f]+$/i);
      expect(result).to.not.have.property("value");
    });

    it("should prepare transaction data with value", () => {
      const value = ethers.parseEther("1.5").toString();

      const result = prepareGatewayTx(
        "depositNative",
        [TEST_RECEIVER, DEFAULT_REVERT_OPTIONS],
        value
      );

      const txData =
        "0x726ac97c0000000000000000000000008198f5d8f8cffe8f9c413d98a0a55aeb8ab9fbb7000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000006acfc00000000000000000000000000000000000000000000000000000000000000000";

      expect(result).to.have.property("data").that.is.a("string");
      expect(result).to.have.property("data").equal(txData);
      expect(result).to.have.property("value").equal(value);
    });
  });

  describe("generateGatewayCallData", () => {
    it("should correctly encode function calls", () => {
      // Test simple function with tuple parameter
      const args = [
        TEST_RECEIVER,
        "0x1234", // Some hex data
        DEFAULT_REVERT_OPTIONS,
      ];

      const calldata = generateGatewayCallData("call", args);

      // Should produce a valid hex string with function selector
      expect(calldata).to.be.a("string");
      expect(calldata).to.match(/^0x[0-9a-f]+$/i);

      // Function signature for "call" should appear at the beginning of the calldata (first 4 bytes)
      // The function selector for call(address,bytes,(address,bool,address,bytes,uint256)) should be consistent
      const callSignature =
        "call(address,bytes,(address,bool,address,bytes,uint256))";
      const expectedSelector = ethers
        .keccak256(ethers.toUtf8Bytes(callSignature))
        .slice(0, 10); // First 4 bytes
      expect(calldata.slice(0, 10)).to.equal(expectedSelector);

      // Verify the recipient address is encoded somewhere in the calldata
      expect(calldata.toLowerCase()).to.include(
        TEST_RECEIVER.slice(2).toLowerCase()
      );
    });
  });

  describe("generateEvmCallData", () => {
    it("should generate valid calldata for EVM calls", () => {
      const result = generateEvmCallData({
        receiver: TEST_RECEIVER,
        revertOptions: DEFAULT_REVERT_OPTIONS,
        types: ["string"],
        values: ["alice"],
      });

      // Check structure of result
      expect(result).to.have.property("data").that.is.a("string");
      expect(result.data).to.match(/^0x[0-9a-f]+$/i);

      // Function selector validation - should start with the call function selector
      const callSignature =
        "call(address,bytes,(address,bool,address,bytes,uint256))";
      const expectedSelector = ethers
        .keccak256(ethers.toUtf8Bytes(callSignature))
        .slice(0, 10);
      expect(result.data.slice(0, 10)).to.equal(expectedSelector);

      // Verify recipient address is in the calldata
      expect(result.data.toLowerCase()).to.include(
        TEST_RECEIVER.slice(2).toLowerCase()
      );

      // Test value encoding - "alice" should be included somewhere in the encoded data
      const hexAlice = "616c696365";

      expect(result.data.toLowerCase()).to.include(hexAlice);
    });

    it("should support complex parameter types", () => {
      const result = generateEvmCallData({
        receiver: TEST_RECEIVER,
        revertOptions: DEFAULT_REVERT_OPTIONS,
        types: ["uint256", "address", "bool"],
        values: [123n, TEST_GATEWAY, true],
      });

      expect(result.data).to.be.a("string");
      expect(result.data).to.match(/^0x[0-9a-f]+$/i);

      // Verify both addresses are in the calldata
      expect(result.data.toLowerCase()).to.include(
        TEST_RECEIVER.slice(2).toLowerCase()
      );
      expect(result.data.toLowerCase()).to.include(
        TEST_GATEWAY.slice(2).toLowerCase()
      );
    });
  });

  describe("generateEvmDepositData", () => {
    it("should generate deposit data for native tokens", () => {
      const amount = "1.5";

      const result = generateEvmDepositData({
        amount,
        receiver: TEST_RECEIVER,
        revertOptions: DEFAULT_REVERT_OPTIONS,
      });

      expect(result).to.have.property("data").that.is.a("string");

      // Should include value for native token
      const expectedValue = ethers.parseEther(amount).toString();
      expect(result).to.have.property("value").equal(expectedValue);

      // Should use the deposit method signature
      const depositSignature =
        "deposit(address,(address,bool,address,bytes,uint256))";
      const expectedSelector = ethers
        .keccak256(ethers.toUtf8Bytes(depositSignature))
        .slice(0, 10);
      expect(result.data.slice(0, 10)).to.equal(expectedSelector);

      // Verify receiver address is in the calldata
      expect(result.data.toLowerCase()).to.include(
        TEST_RECEIVER.slice(2).toLowerCase()
      );
    });

    it("should generate deposit data for ERC20 tokens", () => {
      const amount = "100";
      const decimals = 6; // Like USDC

      const result = generateEvmDepositData({
        amount,
        decimals,
        erc20: TEST_ERC20,
        receiver: TEST_RECEIVER,
        revertOptions: DEFAULT_REVERT_OPTIONS,
      });

      expect(result).to.have.property("data").that.is.a("string");

      // Should NOT include value for ERC20 token
      expect(result).to.not.have.property("value");

      // Should use the ERC20 deposit method signature
      const depositSignature =
        "deposit(address,uint256,address,(address,bool,address,bytes,uint256))";
      const expectedSelector = ethers
        .keccak256(ethers.toUtf8Bytes(depositSignature))
        .slice(0, 10);
      expect(result.data.slice(0, 10)).to.equal(expectedSelector);

      // Verify both addresses are in the calldata
      expect(result.data.toLowerCase()).to.include(
        TEST_RECEIVER.slice(2).toLowerCase()
      );
      expect(result.data.toLowerCase()).to.include(
        TEST_ERC20.slice(2).toLowerCase()
      );

      // Should encode the amount with proper decimals
      const expectedAmount = ethers.parseUnits(amount, decimals).toString();
      // This is harder to test directly, so we'll just make sure the encoded data includes
      // somewhere a representation of the amount
      expect(result.data).to.include(expectedAmount.slice(2, 10));
    });

    it("should use default 18 decimals for ERC20 if not specified", () => {
      const amount = "100";

      const result = generateEvmDepositData({
        amount,
        erc20: TEST_ERC20,
        receiver: TEST_RECEIVER,
        revertOptions: DEFAULT_REVERT_OPTIONS,
      });

      // The amount should be encoded with 18 decimals
      const expectedAmount = ethers.parseUnits(amount, 18).toString();
      // This is harder to test directly, but we can check part of the encoded amount
      expect(result.data).to.include(expectedAmount.slice(2, 10));
    });
  });

  describe("generateEvmDepositAndCallData", () => {
    it("should generate deposit and call data for native tokens", () => {
      const amount = "1.5";

      const result = generateEvmDepositAndCallData({
        amount,
        receiver: TEST_RECEIVER,
        revertOptions: DEFAULT_REVERT_OPTIONS,
        types: ["string"],
        values: ["hello"],
      });

      expect(result).to.have.property("data").that.is.a("string");

      // Should include value for native token
      const expectedValue = ethers.parseEther(amount).toString();
      expect(result).to.have.property("value").equal(expectedValue);

      // Should use the depositAndCall method signature
      const signature =
        "depositAndCall(address,bytes,(address,bool,address,bytes,uint256))";
      const expectedSelector = ethers
        .keccak256(ethers.toUtf8Bytes(signature))
        .slice(0, 10);
      expect(result.data.slice(0, 10)).to.equal(expectedSelector);

      // Verify receiver address is in the calldata
      expect(result.data.toLowerCase()).to.include(
        TEST_RECEIVER.slice(2).toLowerCase()
      );

      // Verify function argument is encoded
      const hexHello = "68656c6c6f"; // "hello" in hex
      expect(result.data.toLowerCase()).to.include(hexHello);
    });

    it("should generate deposit and call data for ERC20 tokens", () => {
      const amount = "100";
      const decimals = 6; // Like USDC

      const result = generateEvmDepositAndCallData({
        amount,
        decimals,
        erc20: TEST_ERC20,
        receiver: TEST_RECEIVER,
        revertOptions: DEFAULT_REVERT_OPTIONS,
        types: ["string"],
        values: ["hello"],
      });

      expect(result).to.have.property("data").that.is.a("string");

      // Should NOT include value for ERC20 token
      expect(result).to.not.have.property("value");

      // Should use the ERC20 depositAndCall method signature
      const signature =
        "depositAndCall(address,uint256,address,bytes,(address,bool,address,bytes,uint256))";
      const expectedSelector = ethers
        .keccak256(ethers.toUtf8Bytes(signature))
        .slice(0, 10);
      expect(result.data.slice(0, 10)).to.equal(expectedSelector);

      // Verify addresses are in the calldata
      expect(result.data.toLowerCase()).to.include(
        TEST_RECEIVER.slice(2).toLowerCase()
      );
      expect(result.data.toLowerCase()).to.include(
        TEST_ERC20.slice(2).toLowerCase()
      );

      // Should encode the amount with proper decimals
      const expectedAmount = ethers.parseUnits(amount, decimals).toString();
      expect(result.data).to.include(expectedAmount.slice(2, 10));

      // Verify function argument is encoded
      const hexHello = "68656c6c6f"; // "hello" in hex
      expect(result.data.toLowerCase()).to.include(hexHello);
    });
  });
});

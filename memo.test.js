var assert = require("assert");
const { Header, FieldsV0, EncodingFormat, OpCode, EncodeToBytes } = require('./memo');
const { Web3 } = require('web3');
const web3 = new Web3();

// Test data
const receiver = "0xEA9808f0Ac504d1F521B5BbdfC33e6f1953757a7";
const payload = new TextEncoder().encode("a payload");
const revertAddress = "tb1q6rufg6myrxurdn0h57d2qhtm9zfmjw2mzcm05q";

// Test case for memo ABI encoding
function testMemoAbi() {
    // Create memo header
    const header = new Header(EncodingFormat.EncodingFmtABI, OpCode.DepositAndCall);

    // Create memo fields
    const fields = new FieldsV0(receiver, payload, revertAddress);

    // Encode standard memo
    const encodedMemo = EncodeToBytes(header, fields);
    const encodedMemoHex = web3.utils.bytesToHex(encodedMemo).slice(2);

    // Expected output
    const expectedHex = '5a001007' + // header
        '000000000000000000000000ea9808f0ac504d1f521b5bbdfc33e6f1953757a7' + // receiver
        '0000000000000000000000000000000000000000000000000000000000000060' + // payload offset
        '00000000000000000000000000000000000000000000000000000000000000a0' + // revertAddress offset
        '0000000000000000000000000000000000000000000000000000000000000009' + // payload length
        '61207061796c6f61640000000000000000000000000000000000000000000000' + // payload
        '000000000000000000000000000000000000000000000000000000000000002a' + // revertAddress length
        '746231713672756667366d7972787572646e3068353764327168746d397a666d6a77326d7a636d30357100000000000000000000000000000000000000000000'; // revertAddress

    // Compare with expected output
    assert.strictEqual(encodedMemoHex, expectedHex, 'ABI encoding failed: encoded bytes do not match expected');

    console.log("Test passed: testMemoAbi");
}

// Test case for memo compact short encoding
function testMemoCompactShort() {
    // Create memo header
    const header = new Header(EncodingFormat.EncodingFmtCompactShort, OpCode.DepositAndCall);

    // Create memo fields
    const fields = new FieldsV0(receiver, payload, revertAddress);

    // Encode standard memo
    const encodedMemo = EncodeToBytes(header, fields);
    const encodedMemoHex = web3.utils.bytesToHex(encodedMemo).slice(2);

    // Expected output
    const expectedHex = '5a011007' + // header
        'ea9808f0ac504d1f521b5bbdfc33e6f1953757a7' + // receiver
        '0961207061796c6f6164' + // payload
        '2a746231713672756667366d7972787572646e3068353764327168746d397a666d6a77326d7a636d303571'; // revertAddress

    // Compare with expected output
    assert.strictEqual(encodedMemoHex, expectedHex, 'Compact short encoding failed: encoded bytes do not match expected');

    console.log("Test passed: testMemoCompactShort");
}

// Test case for memo compact long encoding
function testMemoCompactLong() {
    // Create memo header
    const header = new Header(EncodingFormat.EncodingFmtCompactLong, OpCode.DepositAndCall);

    // Create memo fields
    const fields = new FieldsV0(receiver, payload, revertAddress);

    // Encode standard memo
    const encodedMemo = EncodeToBytes(header, fields);
    const encodedMemoHex = web3.utils.bytesToHex(encodedMemo).slice(2);

    // Expected output
    const expectedHex = '5a021007' + // header
        'ea9808f0ac504d1f521b5bbdfc33e6f1953757a7' + // receiver
        '090061207061796c6f6164' + // payload
        '2a00746231713672756667366d7972787572646e3068353764327168746d397a666d6a77326d7a636d303571'; // revertAddress

    // Compare with expected output
    assert.strictEqual(encodedMemoHex, expectedHex, 'Compact long encoding failed: encoded bytes do not match expected');

    console.log("Test passed: testMemoCompactLong");
}

// Run the test cases
testMemoAbi();
testMemoCompactShort();
testMemoCompactLong();

import { assert, expect } from "chai";
import * as envfile from "envfile";
import fs from "fs";
import path from "path";
import sinon from "sinon";

import { hexToBech32Address, savePrivateKey } from "../tasks/account";

describe("account", () => {
  const privateKey =
    "0xef9d6fabcdb8ea0b530747c52cde41c6ce8f3e13c3021743cdc4fd2a0446820e";
  const filePath = path.join(process.cwd(), ".env");

  let fsWriteFileSyncStub;
  let fsReadFileSyncStub;
  let fsExistsSyncStub;
  let consoleLogStub;

  beforeEach(() => {
    fsWriteFileSyncStub = sinon.stub(fs, "writeFileSync");
    fsReadFileSyncStub = sinon.stub(fs, "readFileSync");
    fsExistsSyncStub = sinon.stub(fs, "existsSync");
    consoleLogStub = sinon.stub(console, "log");
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should save the private key to the .env file", () => {
    fsExistsSyncStub.returns(true);
    fsReadFileSyncStub.returns("");
    savePrivateKey(privateKey);
    expect(fsWriteFileSyncStub.calledOnceWith(filePath, sinon.match.string)).to
      .be.true;

    // Check the content of the written data
    const writtenData = fsWriteFileSyncStub.getCall(0).args[1];
    const parsedData = envfile.parse(writtenData);
    expect(parsedData.PRIVATE_KEY).to.equal(privateKey.slice(2));
  });

  it("should handle non-existing .env file", () => {
    fsExistsSyncStub.returns(false);
    savePrivateKey(privateKey);
    expect(fsWriteFileSyncStub.calledOnceWith(filePath, sinon.match.string)).to
      .be.true;

    // Check the content of the written data
    const writtenData = fsWriteFileSyncStub.getCall(0).args[1];
    const parsedData = envfile.parse(writtenData);
    expect(parsedData.PRIVATE_KEY).to.equal(privateKey.slice(2));
  });

  it("should convert a hex address to a bech32 address", () => {
    const hexAddress = "0x2cD3D070aE1BD365909dD859d29F387AA96911e1";
    const prefix = "zeta";
    const expectedBech32Address = "zeta19nfaqu9wr0fktyyampva98ec025kjy0phww5um";

    const result = hexToBech32Address(hexAddress, prefix);
    assert.strictEqual(result, expectedBech32Address);
  });
});

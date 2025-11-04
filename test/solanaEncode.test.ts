import * as anchor from "@coral-xyz/anchor";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { ethers } from "ethers";

import { solanaEncode } from "../packages/client/src/solanaEncode";

type EncodedResult = {
  accounts: Array<{ isWritable: boolean; publicKey: string }>;
  data: string;
};

const tupleSignature = [
  "tuple(tuple(bytes32 publicKey, bool isWritable)[] accounts, bytes data)",
];

const decodeEncodedResult = (encoded: string): EncodedResult =>
  ethers.AbiCoder.defaultAbiCoder().decode(
    tupleSignature,
    encoded
  )[0] as unknown as EncodedResult;

const hexlifyPubkey = (pubkey: anchor.web3.PublicKey) =>
  ethers.hexlify(pubkey.toBytes());

describe("solanaEncode", () => {
  it("should encode basic data without mint", async () => {
    const input = {
      connected: "mUrEUmbhru5ykcuMdsKdVh9Q75kTq4HqHSbgotQvUEM",
      data: "sol",
      gateway: "94U5AHQMKkV5txNJ17QPXWoh474PheGou6cNP2FEuL1d",
    };

    const connectedProgramId = new anchor.web3.PublicKey(input.connected);
    const [connectedPdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("connected", "utf-8")],
      connectedProgramId
    );
    const [gatewayPdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("meta", "utf-8")],
      new anchor.web3.PublicKey(input.gateway)
    );

    const result = await solanaEncode(input);
    const { accounts, data: encodedData } = decodeEncodedResult(result);

    expect(encodedData).toBe(ethers.hexlify(ethers.toUtf8Bytes(input.data)));
    expect(accounts).toHaveLength(4);

    expect(accounts[0].publicKey).toBe(hexlifyPubkey(connectedPdaAccount));
    expect(accounts[0].isWritable).toBe(true);

    expect(accounts[1].publicKey).toBe(hexlifyPubkey(gatewayPdaAccount));
    expect(accounts[1].isWritable).toBe(false);

    expect(accounts[2].publicKey).toBe(
      hexlifyPubkey(anchor.web3.SystemProgram.programId)
    );
    expect(accounts[2].isWritable).toBe(false);

    expect(accounts[3].publicKey).toBe(
      hexlifyPubkey(anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY)
    );
    expect(accounts[3].isWritable).toBe(false);
  });

  it("should encode data with mint", async () => {
    const input = {
      connected: "mUrEUmbhru5ykcuMdsKdVh9Q75kTq4HqHSbgotQvUEM",
      data: "sol",
      gateway: "94U5AHQMKkV5txNJ17QPXWoh474PheGou6cNP2FEuL1d",
      mint: "A4NAzqwdGRxDxbRfiX5uMPdia6RbGJ3U3W9gvutNzBay",
    };

    const connectedProgramId = new anchor.web3.PublicKey(input.connected);
    const [connectedPdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("connected", "utf-8")],
      connectedProgramId
    );
    const [gatewayPdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("meta", "utf-8")],
      new anchor.web3.PublicKey(input.gateway)
    );
    const mintPubkey = new anchor.web3.PublicKey(input.mint);
    const connectedPdaAta = await getAssociatedTokenAddress(
      mintPubkey,
      connectedPdaAccount,
      true
    );

    const result = await solanaEncode(input);
    const { accounts, data: encodedData } = decodeEncodedResult(result);

    expect(encodedData).toBe(ethers.hexlify(ethers.toUtf8Bytes(input.data)));
    expect(accounts).toHaveLength(7);

    expect(accounts[0].publicKey).toBe(hexlifyPubkey(connectedPdaAccount));
    expect(accounts[0].isWritable).toBe(true);

    expect(accounts[1].publicKey).toBe(hexlifyPubkey(connectedPdaAta));
    expect(accounts[1].isWritable).toBe(true);

    expect(accounts[2].publicKey).toBe(hexlifyPubkey(mintPubkey));
    expect(accounts[2].isWritable).toBe(false);

    expect(accounts[3].publicKey).toBe(hexlifyPubkey(gatewayPdaAccount));
    expect(accounts[3].isWritable).toBe(false);

    expect(accounts[4].publicKey).toBe(
      hexlifyPubkey(anchor.utils.token.TOKEN_PROGRAM_ID)
    );
    expect(accounts[4].isWritable).toBe(false);

    expect(accounts[5].publicKey).toBe(
      hexlifyPubkey(anchor.web3.SystemProgram.programId)
    );
    expect(accounts[5].isWritable).toBe(false);

    expect(accounts[6].publicKey).toBe(
      hexlifyPubkey(anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY)
    );
    expect(accounts[6].isWritable).toBe(false);
  });

  it("should encode data with mint and additional accounts", async () => {
    const input = {
      accounts: [
        "6ipJvT1Q2S9HgpsxdzhAsE1mErG8wDRzxsRfrPJUANFi:true",
        "EnBbkPUT4i24uCqcKGJRrFzXDBjw6qvzUbcTdmUL9H5L:false",
      ],
      connected: "mUrEUmbhru5ykcuMdsKdVh9Q75kTq4HqHSbgotQvUEM",
      data: "sol",
      gateway: "94U5AHQMKkV5txNJ17QPXWoh474PheGou6cNP2FEuL1d",
      mint: "A4NAzqwdGRxDxbRfiX5uMPdia6RbGJ3U3W9gvutNzBay",
    };

    const connectedProgramId = new anchor.web3.PublicKey(input.connected);
    const [connectedPdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("connected", "utf-8")],
      connectedProgramId
    );
    const [gatewayPdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("meta", "utf-8")],
      new anchor.web3.PublicKey(input.gateway)
    );
    const mintPubkey = new anchor.web3.PublicKey(input.mint);
    const connectedPdaAta = await getAssociatedTokenAddress(
      mintPubkey,
      connectedPdaAccount,
      true
    );

    const result = await solanaEncode(input);
    const { accounts, data: encodedData } = decodeEncodedResult(result);

    expect(encodedData).toBe(ethers.hexlify(ethers.toUtf8Bytes(input.data)));
    expect(accounts).toHaveLength(9);

    expect(accounts[0].publicKey).toBe(hexlifyPubkey(connectedPdaAccount));
    expect(accounts[0].isWritable).toBe(true);

    expect(accounts[1].publicKey).toBe(hexlifyPubkey(connectedPdaAta));
    expect(accounts[1].isWritable).toBe(true);

    expect(accounts[2].publicKey).toBe(hexlifyPubkey(mintPubkey));
    expect(accounts[2].isWritable).toBe(false);

    expect(accounts[3].publicKey).toBe(hexlifyPubkey(gatewayPdaAccount));
    expect(accounts[3].isWritable).toBe(false);

    expect(accounts[4].publicKey).toBe(
      hexlifyPubkey(anchor.utils.token.TOKEN_PROGRAM_ID)
    );
    expect(accounts[4].isWritable).toBe(false);

    expect(accounts[5].publicKey).toBe(
      hexlifyPubkey(anchor.web3.SystemProgram.programId)
    );
    expect(accounts[5].isWritable).toBe(false);

    expect(accounts[6].publicKey).toBe(
      hexlifyPubkey(anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY)
    );
    expect(accounts[6].isWritable).toBe(false);

    const additionalAccounts = input.accounts.map((account) => {
      const [publicKey, isWritable] = account.split(":");
      return {
        isWritable: isWritable === "true",
        publicKey: hexlifyPubkey(new anchor.web3.PublicKey(publicKey)),
      };
    });

    additionalAccounts.forEach((expectedAccount, index) => {
      const account = accounts[index + 7];
      expect(account.publicKey).toBe(expectedAccount.publicKey);
      expect(account.isWritable).toBe(expectedAccount.isWritable);
    });
  });

  it("should throw error for invalid account format", async () => {
    const input = {
      accounts: ["invalidAccountFormat"],
      connected: "mUrEUmbhru5ykcuMdsKdVh9Q75kTq4HqHSbgotQvUEM",
      data: "sol",
      gateway: "94U5AHQMKkV5txNJ17QPXWoh474PheGou6cNP2FEuL1d",
    };

    await expect(solanaEncode(input)).rejects.toThrow();
  });

  it("should throw error for invalid public key", async () => {
    const input = {
      connected: "invalid-public-key",
      data: "sol",
      gateway: "94U5AHQMKkV5txNJ17QPXWoh474PheGou6cNP2FEuL1d",
    };

    await expect(solanaEncode(input)).rejects.toThrow();
  });
});

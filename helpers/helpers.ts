import {
  ZetaEth,
  ZetaEth__factory as ZetaEthFactory,
} from "@zetachain/protocol-contracts/dist/typechain-types";

import {
  ZetaConnectorMockValue,
  ZetaConnectorMockValue__factory as ZetaConnectorMockValueFactory,
} from "../typechain-types";
import { BaseContract, ContractFactory } from "ethers";

declare const hre: any;

export type GetContractParams<Factory extends ContractFactory> =
  | {
      deployParams: Parameters<Factory["deploy"]>;
      existingContractAddress?: null;
    }
  | {
      deployParams?: null;
      existingContractAddress: string;
    };

export const getContract = async <
  Factory extends ContractFactory,
  Contract extends BaseContract
>({
  contractName,
  deployParams,
  existingContractAddress,
}: GetContractParams<Factory> & {
  contractName: string;
}): Promise<Contract> => {
  const ContractFactory = (await hre.ethers.getContractFactory(
    contractName
  )) as Factory;

  const isGetExistingContract = Boolean(existingContractAddress);
  if (isGetExistingContract) {
    console.log(
      "Getting existing contract from address:",
      existingContractAddress
    );
    return ContractFactory.attach(existingContractAddress!) as Contract;
  }

  const contract = (await ContractFactory.deploy(...deployParams!)) as Contract;
  await contract.deployed();

  return contract;
};

export const deployZetaConnectorMock = async () => {
  const Factory = (await hre.ethers.getContractFactory(
    "ZetaConnectorMockValue"
  )) as ZetaConnectorMockValueFactory;

  const zetaConnectorMockContract =
    (await Factory.deploy()) as ZetaConnectorMockValue;

  await zetaConnectorMockContract.deployed();

  return zetaConnectorMockContract;
};

export const deployZetaEthMock = async () => {
  const Factory = (await hre.ethers.getContractFactory(
    "ZetaEthMock"
  )) as ZetaEthFactory;

  const zetaConnectorMockContract = (await Factory.deploy(100_000)) as ZetaEth;

  await zetaConnectorMockContract.deployed();

  return zetaConnectorMockContract;
};

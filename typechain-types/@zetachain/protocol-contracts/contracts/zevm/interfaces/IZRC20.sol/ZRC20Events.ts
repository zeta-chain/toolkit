/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type { BaseContract, BigNumber, Signer, utils } from "ethers";
import type { EventFragment } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
  PromiseOrValue,
} from "../../../../../../common";

export interface ZRC20EventsInterface extends utils.Interface {
  functions: {};

  events: {
    "Approval(address,address,uint256)": EventFragment;
    "Deposit(bytes,address,uint256)": EventFragment;
    "Transfer(address,address,uint256)": EventFragment;
    "UpdatedGasLimit(uint256)": EventFragment;
    "UpdatedGateway(address)": EventFragment;
    "UpdatedProtocolFlatFee(uint256)": EventFragment;
    "UpdatedSystemContract(address)": EventFragment;
    "Withdrawal(address,bytes,uint256,uint256,uint256)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "Approval"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "Deposit"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "Transfer"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "UpdatedGasLimit"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "UpdatedGateway"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "UpdatedProtocolFlatFee"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "UpdatedSystemContract"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "Withdrawal"): EventFragment;
}

export interface ApprovalEventObject {
  owner: string;
  spender: string;
  value: BigNumber;
}
export type ApprovalEvent = TypedEvent<
  [string, string, BigNumber],
  ApprovalEventObject
>;

export type ApprovalEventFilter = TypedEventFilter<ApprovalEvent>;

export interface DepositEventObject {
  from: string;
  to: string;
  value: BigNumber;
}
export type DepositEvent = TypedEvent<
  [string, string, BigNumber],
  DepositEventObject
>;

export type DepositEventFilter = TypedEventFilter<DepositEvent>;

export interface TransferEventObject {
  from: string;
  to: string;
  value: BigNumber;
}
export type TransferEvent = TypedEvent<
  [string, string, BigNumber],
  TransferEventObject
>;

export type TransferEventFilter = TypedEventFilter<TransferEvent>;

export interface UpdatedGasLimitEventObject {
  gasLimit: BigNumber;
}
export type UpdatedGasLimitEvent = TypedEvent<
  [BigNumber],
  UpdatedGasLimitEventObject
>;

export type UpdatedGasLimitEventFilter = TypedEventFilter<UpdatedGasLimitEvent>;

export interface UpdatedGatewayEventObject {
  gateway: string;
}
export type UpdatedGatewayEvent = TypedEvent<
  [string],
  UpdatedGatewayEventObject
>;

export type UpdatedGatewayEventFilter = TypedEventFilter<UpdatedGatewayEvent>;

export interface UpdatedProtocolFlatFeeEventObject {
  protocolFlatFee: BigNumber;
}
export type UpdatedProtocolFlatFeeEvent = TypedEvent<
  [BigNumber],
  UpdatedProtocolFlatFeeEventObject
>;

export type UpdatedProtocolFlatFeeEventFilter =
  TypedEventFilter<UpdatedProtocolFlatFeeEvent>;

export interface UpdatedSystemContractEventObject {
  systemContract: string;
}
export type UpdatedSystemContractEvent = TypedEvent<
  [string],
  UpdatedSystemContractEventObject
>;

export type UpdatedSystemContractEventFilter =
  TypedEventFilter<UpdatedSystemContractEvent>;

export interface WithdrawalEventObject {
  from: string;
  to: string;
  value: BigNumber;
  gasFee: BigNumber;
  protocolFlatFee: BigNumber;
}
export type WithdrawalEvent = TypedEvent<
  [string, string, BigNumber, BigNumber, BigNumber],
  WithdrawalEventObject
>;

export type WithdrawalEventFilter = TypedEventFilter<WithdrawalEvent>;

export interface ZRC20Events extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: ZRC20EventsInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {};

  callStatic: {};

  filters: {
    "Approval(address,address,uint256)"(
      owner?: PromiseOrValue<string> | null,
      spender?: PromiseOrValue<string> | null,
      value?: null
    ): ApprovalEventFilter;
    Approval(
      owner?: PromiseOrValue<string> | null,
      spender?: PromiseOrValue<string> | null,
      value?: null
    ): ApprovalEventFilter;

    "Deposit(bytes,address,uint256)"(
      from?: null,
      to?: PromiseOrValue<string> | null,
      value?: null
    ): DepositEventFilter;
    Deposit(
      from?: null,
      to?: PromiseOrValue<string> | null,
      value?: null
    ): DepositEventFilter;

    "Transfer(address,address,uint256)"(
      from?: PromiseOrValue<string> | null,
      to?: PromiseOrValue<string> | null,
      value?: null
    ): TransferEventFilter;
    Transfer(
      from?: PromiseOrValue<string> | null,
      to?: PromiseOrValue<string> | null,
      value?: null
    ): TransferEventFilter;

    "UpdatedGasLimit(uint256)"(gasLimit?: null): UpdatedGasLimitEventFilter;
    UpdatedGasLimit(gasLimit?: null): UpdatedGasLimitEventFilter;

    "UpdatedGateway(address)"(gateway?: null): UpdatedGatewayEventFilter;
    UpdatedGateway(gateway?: null): UpdatedGatewayEventFilter;

    "UpdatedProtocolFlatFee(uint256)"(
      protocolFlatFee?: null
    ): UpdatedProtocolFlatFeeEventFilter;
    UpdatedProtocolFlatFee(
      protocolFlatFee?: null
    ): UpdatedProtocolFlatFeeEventFilter;

    "UpdatedSystemContract(address)"(
      systemContract?: null
    ): UpdatedSystemContractEventFilter;
    UpdatedSystemContract(
      systemContract?: null
    ): UpdatedSystemContractEventFilter;

    "Withdrawal(address,bytes,uint256,uint256,uint256)"(
      from?: PromiseOrValue<string> | null,
      to?: null,
      value?: null,
      gasFee?: null,
      protocolFlatFee?: null
    ): WithdrawalEventFilter;
    Withdrawal(
      from?: PromiseOrValue<string> | null,
      to?: null,
      value?: null,
      gasFee?: null,
      protocolFlatFee?: null
    ): WithdrawalEventFilter;
  };

  estimateGas: {};

  populateTransaction: {};
}

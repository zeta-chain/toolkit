/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumberish,
  BytesLike,
  FunctionFragment,
  Interface,
  EventFragment,
  AddressLike,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedLogDescription,
  TypedListener,
} from "../../../../../../common";

export type RevertContextStruct = {
  sender: AddressLike;
  asset: AddressLike;
  amount: BigNumberish;
  revertMessage: BytesLike;
};

export type RevertContextStructOutput = [
  sender: string,
  asset: string,
  amount: bigint,
  revertMessage: string
] & { sender: string; asset: string; amount: bigint; revertMessage: string };

export interface IZetaConnectorEventsInterface extends Interface {
  getEvent(
    nameOrSignatureOrTopic:
      | "UpdatedZetaConnectorTSSAddress"
      | "Withdrawn"
      | "WithdrawnAndCalled"
      | "WithdrawnAndReverted"
  ): EventFragment;
}

export namespace UpdatedZetaConnectorTSSAddressEvent {
  export type InputTuple = [
    oldTSSAddress: AddressLike,
    newTSSAddress: AddressLike
  ];
  export type OutputTuple = [oldTSSAddress: string, newTSSAddress: string];
  export interface OutputObject {
    oldTSSAddress: string;
    newTSSAddress: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace WithdrawnEvent {
  export type InputTuple = [to: AddressLike, amount: BigNumberish];
  export type OutputTuple = [to: string, amount: bigint];
  export interface OutputObject {
    to: string;
    amount: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace WithdrawnAndCalledEvent {
  export type InputTuple = [
    to: AddressLike,
    amount: BigNumberish,
    data: BytesLike
  ];
  export type OutputTuple = [to: string, amount: bigint, data: string];
  export interface OutputObject {
    to: string;
    amount: bigint;
    data: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace WithdrawnAndRevertedEvent {
  export type InputTuple = [
    to: AddressLike,
    amount: BigNumberish,
    data: BytesLike,
    revertContext: RevertContextStruct
  ];
  export type OutputTuple = [
    to: string,
    amount: bigint,
    data: string,
    revertContext: RevertContextStructOutput
  ];
  export interface OutputObject {
    to: string;
    amount: bigint;
    data: string;
    revertContext: RevertContextStructOutput;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface IZetaConnectorEvents extends BaseContract {
  connect(runner?: ContractRunner | null): IZetaConnectorEvents;
  waitForDeployment(): Promise<this>;

  interface: IZetaConnectorEventsInterface;

  queryFilter<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;
  queryFilter<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;

  on<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  on<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  once<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  once<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  listeners<TCEvent extends TypedContractEvent>(
    event: TCEvent
  ): Promise<Array<TypedListener<TCEvent>>>;
  listeners(eventName?: string): Promise<Array<Listener>>;
  removeAllListeners<TCEvent extends TypedContractEvent>(
    event?: TCEvent
  ): Promise<this>;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getEvent(
    key: "UpdatedZetaConnectorTSSAddress"
  ): TypedContractEvent<
    UpdatedZetaConnectorTSSAddressEvent.InputTuple,
    UpdatedZetaConnectorTSSAddressEvent.OutputTuple,
    UpdatedZetaConnectorTSSAddressEvent.OutputObject
  >;
  getEvent(
    key: "Withdrawn"
  ): TypedContractEvent<
    WithdrawnEvent.InputTuple,
    WithdrawnEvent.OutputTuple,
    WithdrawnEvent.OutputObject
  >;
  getEvent(
    key: "WithdrawnAndCalled"
  ): TypedContractEvent<
    WithdrawnAndCalledEvent.InputTuple,
    WithdrawnAndCalledEvent.OutputTuple,
    WithdrawnAndCalledEvent.OutputObject
  >;
  getEvent(
    key: "WithdrawnAndReverted"
  ): TypedContractEvent<
    WithdrawnAndRevertedEvent.InputTuple,
    WithdrawnAndRevertedEvent.OutputTuple,
    WithdrawnAndRevertedEvent.OutputObject
  >;

  filters: {
    "UpdatedZetaConnectorTSSAddress(address,address)": TypedContractEvent<
      UpdatedZetaConnectorTSSAddressEvent.InputTuple,
      UpdatedZetaConnectorTSSAddressEvent.OutputTuple,
      UpdatedZetaConnectorTSSAddressEvent.OutputObject
    >;
    UpdatedZetaConnectorTSSAddress: TypedContractEvent<
      UpdatedZetaConnectorTSSAddressEvent.InputTuple,
      UpdatedZetaConnectorTSSAddressEvent.OutputTuple,
      UpdatedZetaConnectorTSSAddressEvent.OutputObject
    >;

    "Withdrawn(address,uint256)": TypedContractEvent<
      WithdrawnEvent.InputTuple,
      WithdrawnEvent.OutputTuple,
      WithdrawnEvent.OutputObject
    >;
    Withdrawn: TypedContractEvent<
      WithdrawnEvent.InputTuple,
      WithdrawnEvent.OutputTuple,
      WithdrawnEvent.OutputObject
    >;

    "WithdrawnAndCalled(address,uint256,bytes)": TypedContractEvent<
      WithdrawnAndCalledEvent.InputTuple,
      WithdrawnAndCalledEvent.OutputTuple,
      WithdrawnAndCalledEvent.OutputObject
    >;
    WithdrawnAndCalled: TypedContractEvent<
      WithdrawnAndCalledEvent.InputTuple,
      WithdrawnAndCalledEvent.OutputTuple,
      WithdrawnAndCalledEvent.OutputObject
    >;

    "WithdrawnAndReverted(address,uint256,bytes,tuple)": TypedContractEvent<
      WithdrawnAndRevertedEvent.InputTuple,
      WithdrawnAndRevertedEvent.OutputTuple,
      WithdrawnAndRevertedEvent.OutputObject
    >;
    WithdrawnAndReverted: TypedContractEvent<
      WithdrawnAndRevertedEvent.InputTuple,
      WithdrawnAndRevertedEvent.OutputTuple,
      WithdrawnAndRevertedEvent.OutputObject
    >;
  };
}

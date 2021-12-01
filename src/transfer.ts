import { Hash, HexString, utils } from "@ckb-lumos/base";
import { Reader } from "ckb-js-toolkit";
import { SerializeRawL2Transaction } from "../schemas";
import { NormalizeRawL2Transaction, RawL2Transaction } from "./normalizer";
import keccak256 from "keccak256";
import {
  buildProcess,
  Godwoker,
  EthTransaction,
  Process,
  ProcessTransactionType,
  Abi,
  RequireResult,
  buildL2TransactionWithAddressMapping,
  buildSerializeAddressMappingAbiItem,
  decodeArgs,
  formalizeEthToAddress,
} from "@polyjuice-provider/base";
import { AddressMappingItem } from "@polyjuice-provider/godwoken/lib/addressTypes";

/**
 * Layer2 transaction => message
 *
 * @param rawL2Transaction
 * @param senderScriptHash godwokenClient.getScriptHash(rawL2Transactiom.from_id)
 * @param receiverScriptHash godwokenClient.getScriptHash(rawL2Transaction.to_id), to_id = 0 when create account
 * @param rollupTypeHash for example: https://github.com/nervosnetwork/godwoken-public/blob/5a5d5379b7/testnet/config/config.toml#L23
 * @returns
 */
export function generateTransactionMessage(
  rawL2Transaction: RawL2Transaction,
  senderScriptHash: Hash,
  receiverScriptHash: Hash,
  rollupTypeHash: Hash
): HexString {
  const rawTxHex = new Reader(
    SerializeRawL2Transaction(NormalizeRawL2Transaction(rawL2Transaction))
  ).serializeJson();

  const data =
    rollupTypeHash +
    senderScriptHash.slice(2) +
    receiverScriptHash.slice(2) +
    rawTxHex.slice(2);
  const message = new utils.CKBHasher().update(data).digestHex();

  const prefix = Buffer.from(`\x19Ethereum Signed Message:\n32`);
  const buf = Buffer.concat([prefix, Buffer.from(message.slice(2), "hex")]);
  return `0x${keccak256(buf).toString("hex")}`;
}

/**
 * This method shows how to change a eth transaction to a Godwoken raw l2 transaction
 *
 * @param abi
 * @param godwoker
 * @param ethTransaction
 * @returns
 */
export async function ethTransactionToRawL2Transaction(
  abi: Abi,
  godwoker: Godwoker,
  ethTransaction: EthTransaction
) {
  await godwoker.init();
  const process: Process = {
    type: ProcessTransactionType.estimateGas,
    executeEstimateGasMethod: () => {
      console.log("executeEstimateGasMethod");
    },
  };
  const rawL2Tx = await buildProcess(abi, godwoker, ethTransaction, process);
  if (typeof rawL2Tx === "string") {
    throw new Error("rawL2Tx should not be string type.");
  }
  return rawL2Tx as RawL2Transaction;
}

/**
 * for erc20 l2 transaction, the serialized data will be submit to web3 rpc poly_submitL2Transaction instead of gw_submit_l2transaction
 * This method shows how to serialize a Godwoken-Polyjuice raw l2 transaction meets the poly_submitL2Transaction.
 * the addressMapping is use for saving non-exist-yet eoa address in web3, you can get it from getAddressMapping() below
 *
 * @param abi
 * @param godwoker
 * @param rawL2Transaction
 * @param signature: string,
 * @param addressMappingVec: AddressMappingItem[]
 * @returns
 */
export function serializePolyL2Transaction(
  abi: Abi,
  godwoker: Godwoker,
  rawL2Transaction: RawL2Transaction,
  signature: string,
  addressMappingVec: AddressMappingItem[]
) {
  const { data } = decodeArgs(rawL2Transaction.args);
  let serializedAbiItem = buildSerializeAddressMappingAbiItem(abi, data);
  const l2Tx = {
    raw: rawL2Transaction,
    signature: signature,
  };
  const polyL2Tx = buildL2TransactionWithAddressMapping(
    l2Tx,
    addressMappingVec,
    serializedAbiItem
  );
  return godwoker.serializeL2TransactionWithAddressMapping(polyL2Tx);
}

export async function getAddressMapping(
  abi: Abi,
  godwoker: Godwoker,
  ethTransaction: EthTransaction
) {
  await godwoker.init();

  let addressMappingItemVec: AddressMappingItem[] = [];
  function setAddressMappingItemVec(
    _addressMappingItemVec: AddressMappingItem[]
  ) {
    addressMappingItemVec = _addressMappingItemVec;
  }

  ethTransaction.from = ethTransaction.from || godwoker.default_from_address!;
  await abi.refactor_data_with_short_address(
    ethTransaction.data,
    godwoker.getShortAddressByAllTypeEthAddress.bind(godwoker),
    setAddressMappingItemVec
  );
  return addressMappingItemVec;
}

export async function estimateGas(
  abi: Abi,
  godwoker: Godwoker,
  ethTransaction: EthTransaction
) {
  await godwoker.init();

  ethTransaction.from = ethTransaction.from || godwoker.default_from_address!;
  const dataWithShortAddress = await abi.refactor_data_with_short_address(
    ethTransaction.data,
    godwoker.getShortAddressByAllTypeEthAddress.bind(godwoker)
  );

  const ethTx = {
    from: ethTransaction.from,
    to: formalizeEthToAddress(ethTransaction.to),
    value: ethTransaction.value,
    data: dataWithShortAddress,
  };

  const gasHexNumber = await godwoker.jsonRPC(
    "eth_estimateGas",
    [ethTx],
    "failed to call eth_estimateGas, result null.",
    RequireResult.canNotBeEmpty
  );
  return gasHexNumber;
}

// a more simple method if you can provide a signingMethod callback function
// the result of this function can be submit to godwoken network
// through web3 rpc with `poly_submitL2Transaction` method
export async function ethTransactionToSerializedPolyL2Transaction(
  abi: Abi,
  godwoker: Godwoker,
  ethTransaction: EthTransaction,
  signingMethod: (message: string) => string | Promise<string>
) {
  await godwoker.init();
  const process: Process = {
    type: ProcessTransactionType.send,
    signingMethod: signingMethod,
  };
  const serializedPolyL2Transaction = await buildProcess(
    abi,
    godwoker,
    ethTransaction,
    process
  );
  return serializedPolyL2Transaction;
}

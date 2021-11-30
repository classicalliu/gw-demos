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
} from "@polyjuice-provider/base";

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

  return rawL2Tx;
}

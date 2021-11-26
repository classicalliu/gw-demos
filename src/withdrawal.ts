import {
  Cell,
  Hash,
  HexNumber,
  HexString,
  Script,
  utils,
} from "@ckb-lumos/base";
import { Reader } from "ckb-js-toolkit";
import {
  SerializeRawWithdrawalRequest,
  SerializeWithdrawalLockArgs,
} from "../schemas";
import { GodwokenClient } from "./godwoken";
import { privateKeyToLayer2ScriptHash, signMessage } from "./helpers";
import {
  NormalizeRawWithdrawalRequest,
  NormalizeWithdrawalLockArgs,
  RawWithdrawalRequest,
  WithdrawalLockArgs,
  WithdrawalRequest,
} from "./normalizer";
import keccak256 from "keccak256";
import { minimalCellCapacity } from "@ckb-lumos/helpers";

/**
 *
 * @param godwokenClient Godwoken RPC client
 * @param rollupTypeHash
 * @param ethAccountTypeHash
 * @param privateKey withdrawal account private key
 * @param ownerLockHash owner ckb account lock hash
 * @param capacity CKB capacity, unit in shannons
 * @param amount sUdt amount, fill with 0 if only withdraw CKB
 * @param sudtScriptHash l1 sudt script hash, fill with all-zeros for withdraw CKB
 * @param sellCapacity
 * @param sellAmount
 * @param paymentLockHash you can fill with paymentLockHash & sellCapacity & sellAmount, and means this paymentLockHash owner can pay sellCapacity & sellAmount to buy your withdrawal cell
 * @param feeSudtId sudt account id for pay fee, 0 for CKB
 * @param feeAmount amount for fee
 * @returns
 */
export async function withdrawal(
  godwokenClient: GodwokenClient,
  rollupTypeHash: Hash,
  ethAccountTypeHash: Hash,
  privateKey: HexString,
  ownerLockHash: Hash,
  capacity: HexNumber,
  amount: HexNumber = "0x0",
  sudtScriptHash: Hash = "0x" + "00".repeat(32),
  sellCapacity: HexNumber = "0x0",
  sellAmount: HexNumber = "0x0",
  paymentLockHash: HexNumber = "0x" + "00".repeat(32),
  feeSudtId: HexNumber = "0x1",
  feeAmount: HexNumber = "0x0"
): Promise<WithdrawalRequest> {
  const accountScriptHash = await privateKeyToLayer2ScriptHash(
    privateKey,
    ethAccountTypeHash,
    rollupTypeHash
  );
  console.log("account script hash:", accountScriptHash);

  const fromId = await godwokenClient.getAccountIdByScriptHash(
    accountScriptHash
  );
  if (!fromId) {
    console.error("from id not found!");
    process.exit(-1);
  }

  const isSudt =
    sudtScriptHash !==
    "0x0000000000000000000000000000000000000000000000000000000000000000";
  let minCapacity = minimalWithdrawalCapacity(isSudt);
  if (BigInt(capacity) < BigInt(minCapacity)) {
    throw new Error(
      `Withdrawal required ${BigInt(
        minCapacity
      )} shannons at least, provided ${BigInt(capacity)}.`
    );
  }

  const nonce: HexNumber = await godwokenClient.getNonce(fromId);
  console.log("nonce:", nonce);

  const rawWithdrawalRequest: RawWithdrawalRequest = {
    nonce: "0x" + BigInt(nonce).toString(16),
    capacity: "0x" + BigInt(capacity).toString(16),
    amount: "0x" + BigInt(amount).toString(16),
    sudt_script_hash: sudtScriptHash,
    account_script_hash: accountScriptHash,
    sell_amount: sellAmount,
    sell_capacity: sellCapacity,
    owner_lock_hash: ownerLockHash,
    payment_lock_hash: paymentLockHash,
    fee: {
      sudt_id: feeSudtId,
      amount: feeAmount,
    },
  };

  console.log("rawWithdrawalRequest:", rawWithdrawalRequest);

  const message = generateWithdrawalMessageToSign(
    rawWithdrawalRequest,
    rollupTypeHash
  );

  console.log("message:", message);

  const signature: HexString = signMessage(message, privateKey);

  const withdrawalRequest: WithdrawalRequest = {
    raw: rawWithdrawalRequest,
    signature: signature,
  };

  console.log("withdrawalRequest:", withdrawalRequest);

  // using RPC `submitWithdrawalRequest` to submit withdrawal request to godwoken
  // const result = await godwokenClient.submitWithdrawalRequest(withdrawalRequest);

  return withdrawalRequest;
}

function generateWithdrawalMessageToSign(
  rawWithdrawalRequest: RawWithdrawalRequest,
  rollupTypeHash: Hash
): Hash {
  const serializedRawWithdrawalRequest: HexString = new Reader(
    SerializeRawWithdrawalRequest(
      NormalizeRawWithdrawalRequest(rawWithdrawalRequest)
    )
  ).serializeJson();

  const data = new Reader(
    rollupTypeHash + serializedRawWithdrawalRequest.slice(2)
  ).toArrayBuffer();
  const message = utils.ckbHash(data).serializeJson();

  const prefixBuf = Buffer.from(`\x19Ethereum Signed Message:\n32`);
  const buf = Buffer.concat([prefixBuf, Buffer.from(message.slice(2), "hex")]);
  return `0x${keccak256(buf).toString("hex")}`;
}

/**
 * calculate withdrawal request minimal required capacity
 *
 * @param isSudt is sudt or not
 * @returns
 */
export function minimalWithdrawalCapacity(isSudt: boolean): HexNumber {
  // fixed size, the specific value is not important.
  const dummyHash: Hash = "0x" + "00".repeat(32);
  const dummyHexNumber: HexNumber = "0x0";
  const dummyRollupTypeHash: Hash = dummyHash;

  const dummyWithdrawalLockArgs: WithdrawalLockArgs = {
    account_script_hash: dummyHash,
    withdrawal_block_hash: dummyHash,
    withdrawal_block_number: dummyHexNumber,
    sudt_script_hash: dummyHash,
    sell_amount: dummyHexNumber,
    sell_capacity: dummyHexNumber,
    owner_lock_hash: dummyHash,
    payment_lock_hash: dummyHash,
  };

  const serialized: HexString = new Reader(
    SerializeWithdrawalLockArgs(
      NormalizeWithdrawalLockArgs(dummyWithdrawalLockArgs)
    )
  ).serializeJson();

  const args = dummyRollupTypeHash + serialized.slice(2);

  const lock: Script = {
    code_hash: dummyHash,
    hash_type: "data",
    args,
  };

  let type: Script | undefined = undefined;
  let data = "0x";
  if (isSudt) {
    type = {
      code_hash: dummyHash,
      hash_type: "data",
      args: dummyHash,
    };
    data = "0x" + "00".repeat(16);
  }

  const cell: Cell = {
    cell_output: {
      lock,
      type,
      capacity: dummyHexNumber,
    },
    data,
  };

  const capacity: bigint = minimalCellCapacity(cell);

  return "0x" + capacity.toString(16);
}

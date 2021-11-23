import {
  Cell,
  Hash,
  HexNumber,
  HexString,
  PackedSince,
  Script,
  utils,
} from "@ckb-lumos/base";
import { parseAddress } from "@ckb-lumos/helpers";
import { Reader } from "ckb-js-toolkit";
import { SerializeDepositLockArgs } from "../schemas";
import { NormalizeDepositLockArgs } from "./normalizer";
import { predefined } from "@ckb-lumos/config-manager";

export interface DepositLockArgs {
  owner_lock_hash: Hash;
  layer2_lock: Script;
  cancel_timeout: PackedSince;
}

/**
 *
 * @param ethAddress ethereum eoa address
 * @param fromCkbAddress ckb address, CKBytes for deposit from which address
 * @param capacity CKB amount, unit in shannons
 * @param ethAccountTypeHash Eth account lock type hash, from godwoken config
 * @param rollupTypeHash Rollup type hash, from godwoken config
 * @param depositLockTypeHash Deposit lock type hash, from godwoken config
 * @param networkType testnet(AGGRON4 / devnet) OR mainnet(LINA), just to distinguish the CKB address format
 * @param cancelTimeout default to relative time, 2 days
 */
export function ethAddressToCkbLockScript(
  ethAddress: HexString,
  fromCkbAddress: string,
  capacity: HexNumber,
  ethAccountTypeHash: Hash,
  rollupTypeHash: Hash,
  depositLockTypeHash: Hash,
  networkType: "testnet" | "mainnet" = "testnet",
  cancelTimeout: PackedSince = "0xc00000000002a300"
): Cell {
  let config = predefined["AGGRON4"];
  if (networkType === "mainnet") {
    config = predefined["LINA"];
  }

  // ckb address => ckb lock script
  const ownerLock: Script = parseAddress(fromCkbAddress, { config });
  // ckb lock script => ckb lock script hash
  const ownerLockHash: Hash = utils.computeScriptHash(ownerLock);
  const layer2Lock: Script = {
    code_hash: ethAccountTypeHash,
    hash_type: "type",
    args: rollupTypeHash + ethAddress.slice(2).toLowerCase(),
  };
  console.log("layer2 lock:", layer2Lock);

  const depositLockArgs: DepositLockArgs = {
    owner_lock_hash: ownerLockHash,
    layer2_lock: layer2Lock,
    cancel_timeout: cancelTimeout,
  };

  console.log("layer2 deposit lock args:", depositLockArgs);

  const l2ScriptHash = utils.computeScriptHash(depositLockArgs.layer2_lock);
  console.log(`Godwoken script hash: ${l2ScriptHash}`);
  console.log("Godwoken script hash(160):", l2ScriptHash.slice(0, 42));

  const serializedArgs: HexString = serializeArgs(
    depositLockArgs,
    rollupTypeHash
  );

  const depositLock: Script = {
    code_hash: depositLockTypeHash,
    hash_type: "type",
    args: serializedArgs,
  };

  console.log("layer2 deposit lock:", depositLock);

  const outputCell: Cell = {
    cell_output: {
      capacity: "0x" + BigInt(capacity).toString(16),
      lock: depositLock,
    },
    data: "0x",
  };

  console.log("layer1 output cell:", outputCell);

  return outputCell;
}

export function getDepositLockArgs(
  ownerLockHash: Hash,
  layer2_lock: Script,
  cancelTimeout: PackedSince = "0xc00000000002a300"
): DepositLockArgs {
  const depositLockArgs: DepositLockArgs = {
    owner_lock_hash: ownerLockHash,
    layer2_lock: layer2_lock,
    cancel_timeout: cancelTimeout, // relative timestamp, 2 days
  };
  return depositLockArgs;
}

/**
 * Serialize DepositLockArgs and concat with rollup type hash
 *
 * @param args
 * @param rollupTypeHash
 * @returns
 */
export function serializeArgs(
  args: DepositLockArgs,
  rollupTypeHash: Hash
): HexString {
  const serializedDepositLockArgs: ArrayBuffer = SerializeDepositLockArgs(
    NormalizeDepositLockArgs(args)
  );

  const depositLockArgsStr: HexString = new Reader(
    serializedDepositLockArgs
  ).serializeJson();

  return rollupTypeHash + depositLockArgsStr.slice(2);
}

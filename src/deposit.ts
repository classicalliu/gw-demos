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

// https://github.com/nervosnetwork/godwoken/blob/v0.7.0-rc1/crates/types/schemas/godwoken.mol#L160
// more molecule info: https://github.com/nervosnetwork/molecule
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
 * @param ethAccountTypeHash Eth account lock type hash, from godwoken config, see https://github.com/nervosnetwork/godwoken-public/blob/9b53469bff/testnet/config/scripts-deploy-result.json#L83 for example
 * @param rollupTypeHash Rollup type hash, from godwoken config, see https://github.com/nervosnetwork/godwoken-public/blob/9b53469bff9d3a3632d87c99bfa1cd05a37871f9/testnet/config/config.toml#L23 for example
 * @param depositLockTypeHash Deposit lock type hash, from godwoken config, see https://github.com/nervosnetwork/godwoken-public/blob/9b53469bff/testnet/config/scripts-deploy-result.json#L13 for example
 * @param networkType testnet(AGGRON4 / devnet) OR mainnet(LINA), just to distinguish the CKB address format
 * @param cancelTimeout default to relative timestamp, 20mins, see https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0017-tx-valid-since/0017-tx-valid-since.md for details.
 */
export function ethAddressToCkbLockScript(
  ethAddress: HexString,
  fromCkbAddress: string,
  capacity: HexNumber,
  ethAccountTypeHash: Hash,
  rollupTypeHash: Hash,
  depositLockTypeHash: Hash,
  networkType: "testnet" | "mainnet" = "testnet",
  cancelTimeout: PackedSince = "0xc0000000000004b0"
): Cell {
  let config = predefined["AGGRON4"];
  if (networkType === "mainnet") {
    config = predefined["LINA"];
  }

  // ckb address => ckb lock script
  // see https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0021-ckb-address-format/0021-ckb-address-format.md for more info
  const ownerLock: Script = parseAddress(fromCkbAddress, { config });

  // ckb lock script => ckb lock script hash
  // compute script hash using blake2b with personalization = "ckb-default-hash"
  // https://github.com/nervosnetwork/lumos/blob/v0.18.0-rc1/packages/base/lib/utils.js#L6-L36
  // https://github.com/nervosnetwork/lumos/blob/v0.18.0-rc1/packages/base/lib/utils.js#L73-L81
  // SerializeScript(normalizers.NormalizeScript(script)) is the way in TypeScript to serialize script with molecule.
  const ownerLockHash: Hash = utils.computeScriptHash(ownerLock);

  // args = rollup type hash + eth address
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

  // Serialize DepositLockArgs with molecule(https://github.com/nervosnetwork/molecule) and get result with HexString format.
  const depositLockArgsHexString: HexString = new Reader(
    SerializeDepositLockArgs(NormalizeDepositLockArgs(depositLockArgs))
  ).serializeJson();

  const depositLock: Script = {
    code_hash: depositLockTypeHash,
    hash_type: "type",
    args: rollupTypeHash + depositLockArgsHexString.slice(2),
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

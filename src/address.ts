import { Hash, HexNumber, HexString, Script, utils } from "@ckb-lumos/base";
import { GodwokenClient } from "./godwoken";

/**
 * Convert eth address to godwoken account id
 *
 * @param ethAddress
 * @param ethAccountTypeHash Eth account lock type hash, from godwoken config, see https://github.com/nervosnetwork/godwoken-public/blob/9b53469bff/testnet/config/scripts-deploy-result.json#L83 for example
 * @param rollupTypeHash Rollup type hash, from godwoken config, see https://github.com/nervosnetwork/godwoken-public/blob/9b53469bff9d3a3632d87c99bfa1cd05a37871f9/testnet/config/config.toml#L23 for example
 * @param creatorAccountId Polyjuice creator account id, see https://github.com/nervosnetwork/godwoken-public/blob/master/testnet/README.md for example
 * @param godwokenClient
 * @returns
 */
export async function allTypeEthAddressToAccountId(
  ethAddress: HexString,
  ethAccountTypeHash: Hash,
  rollupTypeHash: Hash,
  creatorAccountId: HexNumber,
  godwokenClient: GodwokenClient
): Promise<HexNumber | undefined> {
  const accountId: HexNumber | undefined = await ethContractAddressToAccountId(
    ethAddress,
    creatorAccountId,
    godwokenClient
  );
  if (accountId != null) {
    return accountId;
  }

  const id: HexNumber | undefined = await ethEoaAddressToAccountId(
    ethAddress,
    ethAccountTypeHash,
    rollupTypeHash,
    godwokenClient
  );

  return id;
}

export function ethEoaAddressToGodwokenScriptHash(
  ethAddress: HexString,
  ethAccountTypeHash: Hash,
  rollupTypeHash: Hash
): HexString {
  if (ethAddress.length !== 42 || !ethAddress.startsWith("0x")) {
    throw new Error("eth address format error!");
  }

  const layer2Lock: Script = {
    code_hash: ethAccountTypeHash,
    hash_type: "type",
    args: rollupTypeHash + ethAddress.slice(2).toLowerCase(),
  };
  const scriptHash = utils.computeScriptHash(layer2Lock);
  return scriptHash;
}

export async function ethEoaAddressToAccountId(
  ethAddress: HexString,
  ethAccountTypeHash: Hash,
  rollupTypeHash: Hash,
  godwokenClient: GodwokenClient
): Promise<HexNumber | undefined> {
  const scriptHash = ethEoaAddressToGodwokenScriptHash(
    ethAddress,
    ethAccountTypeHash,
    rollupTypeHash
  );

  // Return null if account id not exists
  const accountId = await godwokenClient.getAccountIdByScriptHash(scriptHash);
  return accountId;
}

// contract address = godwoken script hash 160
export async function ethContractAddressToAccountId(
  address: string,
  creatorAccountId: HexNumber,
  godwokenClient: GodwokenClient
): Promise<HexNumber | undefined> {
  if (address.length !== 42) {
    throw new Error(`Invalid eth address length: ${address.length}`);
  }
  if (address === "0x0000000000000000000000000000000000000000") {
    return creatorAccountId;
  }
  const scriptHash: Hash | undefined =
    await godwokenClient.getScriptHashByShortAddress(address);
  if (scriptHash == null) {
    return undefined;
  }
  const accountId: HexNumber | undefined =
    await godwokenClient.getAccountIdByScriptHash(scriptHash);
  return accountId;
}

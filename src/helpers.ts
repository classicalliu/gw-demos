import { HexString, Script, utils, Hash, HexNumber } from "@ckb-lumos/base";
import crypto from "crypto";
import keccak256 from "keccak256";
import { GodwokenClient } from "./godwoken";
import * as secp256k1 from "secp256k1";
import { Reader } from "ckb-js-toolkit";

export function privateKeyToEthAddress(privateKey: HexString) {
  const ecdh = crypto.createECDH(`secp256k1`);
  ecdh.generateKeys();
  ecdh.setPrivateKey(Buffer.from(privateKey.slice(2), "hex"));
  const publicKey: string = "0x" + ecdh.getPublicKey("hex", "uncompressed");
  const ethAddress =
    "0x" +
    keccak256(Buffer.from(publicKey.slice(4), "hex"))
      .slice(12)
      .toString("hex");
  return ethAddress;
}

export async function privateKeyToLayer2ScriptHash(
  privateKey: HexString,
  ethAccountTypeHash: Hash,
  rollupTypeHash: Hash
): Promise<Hash> {
  const ethAddress = privateKeyToEthAddress(privateKey);
  const script: Script = {
    code_hash: ethAccountTypeHash,
    hash_type: "type",
    args: rollupTypeHash + ethAddress.slice(2),
  };

  const scriptHash = utils.computeScriptHash(script);
  return scriptHash;
}

export async function privateKeyToAccountId(
  godwokenClient: GodwokenClient,
  privateKey: HexString,
  ethAccountTypeHash: Hash,
  rollupTypeHash: Hash
): Promise<HexNumber | undefined> {
  const scriptHash = await privateKeyToLayer2ScriptHash(
    privateKey,
    ethAccountTypeHash,
    rollupTypeHash
  );

  const id = await godwokenClient.getAccountIdByScriptHash(scriptHash);

  return id;
}

export function signMessage(message: Hash, privateKey: HexString): HexString {
  const signObject = secp256k1.ecdsaSign(
    new Uint8Array(new Reader(message).toArrayBuffer()),
    new Uint8Array(new Reader(privateKey).toArrayBuffer())
  );
  const signatureBuffer = new ArrayBuffer(65);
  const signatureArray = new Uint8Array(signatureBuffer);
  signatureArray.set(signObject.signature, 0);
  let v = signObject.recid;
  if (v >= 27) {
    v -= 27;
  }
  signatureArray.set([v], 64);

  const signature = new Reader(signatureBuffer).serializeJson();
  return signature;
}

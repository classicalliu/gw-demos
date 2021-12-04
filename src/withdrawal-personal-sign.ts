import { Hash, HexString, utils } from "@ckb-lumos/base";
import { Reader } from "ckb-js-toolkit";
import {
  NormalizeRawWithdrawalRequest,
  RawWithdrawalRequest,
} from "./normalizer";
import * as schemas from "../schemas";
import keccak256 from "keccak256";
import * as secp256k1 from "secp256k1";

export function signWithdrawal() {
  const rawWithdrawalRequest: RawWithdrawalRequest = {
    nonce: "0x7",
    capacity: "0x9502f9000",
    amount: "0x0",
    sudt_script_hash:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    account_script_hash:
      "0xfa2ae9de22bbca35fc44f20efe7a3d2789556d4c50a7c2b4e460269f13b77c58",
    sell_amount: "0x0",
    sell_capacity: "0x0",
    owner_lock_hash:
      "0x840ce8aad056eecaf66ba42015567e000f71d952754326062ad7b9565833c131",
    payment_lock_hash:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    fee: { sudt_id: "0x1", amount: "0x0" },
  };

  console.log("rawWithdrawalRequest:", rawWithdrawalRequest);

  const rollupTypeHash =
    "0x40d73f0d3c561fcaae330eabc030d8d96a9d0af36d0c5114883658a350cb9e3b";
  const message = generateWithdrawalMessageToSign(
    rawWithdrawalRequest,
    rollupTypeHash
  );

  console.log(
    "message (This message is equal to message pass to `personal_sign` in ethereum):",
    message
  );

  // const privateKey = "";
  // const signature: HexString = signMessage(message, privateKey);
  // console.log("signature:", signature)

  // const withdrawalRequest: WithdrawalRequest = {
  //   raw: rawWithdrawalRequest,
  //   signature,
  // }

  // const serializedWithdrawalRequest = new Reader(
  //   schemas.SerializeWithdrawalRequest(
  //     NormalizeWithdrawalRequest(withdrawalRequest)
  //   )
  // ).serializeJson();

  // console.log("serialized withdrawal request:", serializedWithdrawalRequest)
}
signWithdrawal();

function generateWithdrawalMessageToSign(
  rawWithdrawalRequest: RawWithdrawalRequest,
  rollupTypeHash: Hash
): Hash {
  const serializedRawWithdrawalRequest: HexString = new Reader(
    schemas.SerializeRawWithdrawalRequest(
      NormalizeRawWithdrawalRequest(rawWithdrawalRequest)
    )
  ).serializeJson();

  const data = new Reader(
    rollupTypeHash + serializedRawWithdrawalRequest.slice(2)
  ).toArrayBuffer();
  const message = utils.ckbHash(data).serializeJson();
  return message;
}

function signMessage(msg: Hash, privateKey: HexString): HexString {
  // personal sign
  const prefixBuf = Buffer.from(`\x19Ethereum Signed Message:\n32`);
  const buf = Buffer.concat([prefixBuf, Buffer.from(msg.slice(2), "hex")]);
  const message = `0x${keccak256(buf).toString("hex")}`;
  const signObject = secp256k1.ecdsaSign(
    new Uint8Array(new Reader(message).toArrayBuffer()),
    new Uint8Array(new Reader(privateKey).toArrayBuffer())
  );
  const signatureBuffer = new ArrayBuffer(65);
  const signatureArray = new Uint8Array(signatureBuffer);
  signatureArray.set(signObject.signature, 0);
  let v = signObject.recid;

  // This operation not included in personal sign, but required by ethereum
  if (v >= 27) {
    v -= 27;
  }
  signatureArray.set([v], 64);

  const signature = new Reader(signatureBuffer).serializeJson();
  return signature;
}

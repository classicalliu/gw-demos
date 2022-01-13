import { Hash, HexNumber, HexString, Script } from "@ckb-lumos/base";
import { GodwokenClient } from "./godwoken";
import { generateTransactionMessage } from "./transfer";
import { signMessage, privateKeyToAccountId } from "./helpers";
import {
  L2Transaction,
  NormalizeCreateAccount,
  RawL2Transaction,
} from "./normalizer";
import { Reader } from "ckb-js-toolkit";
import { SerializeCreateAccount } from "../schemas";

/**
 *
 * @param godwokenClient Godwoken RPC client
 * @param privateKey from account's private key, for sign message
 * @param sudtId sudt id, 0x1 for CKB
 * @param feeAmount if sudtId = "0x1", unit would be shannons.
 * @param rollupTypeHash Rollup type hash, from godwoken config, see https://github.com/nervosnetwork/godwoken-public/blob/9b53469bff9d3a3632d87c99bfa1cd05a37871f9/testnet/config/config.toml#L23 for example
 * @param ethAccountTypeHash Eth account lock type hash, from godwoken config, see https://github.com/nervosnetwork/godwoken-public/blob/9b53469bff/testnet/config/scripts-deploy-result.json#L83 for example
 * @param ethAddress ethereum eoa address
 * @returns
 */
export async function createEoaAccount(
  godwokenClient: GodwokenClient,
  privateKey: HexString,
  sudtId: HexNumber,
  feeAmount: HexNumber,
  rollupTypeHash: Hash,
  ethAccountTypeHash: Hash,
  ethAddress: HexString
): Promise<L2Transaction> {
  const fromId: HexNumber | undefined = await privateKeyToAccountId(
    godwokenClient,
    privateKey,
    ethAccountTypeHash,
    rollupTypeHash
  )!;
  if (!fromId) {
    console.error("Account id of provided private key not found!");
    process.exit(-1);
  }
  console.log("Your from id:", +fromId);

  const nonce = await godwokenClient.getNonce(fromId);

  const l2Script: Script = {
    code_hash: ethAccountTypeHash,
    hash_type: "type",
    args: rollupTypeHash + ethAddress.slice(2).toLowerCase(),
  };

  const rawL2Tx = createAccountRawL2Transaction(
    fromId,
    nonce,
    l2Script,
    sudtId,
    feeAmount
  );

  const senderScriptHash = await godwokenClient.getScriptHash(fromId);
  const receiverScriptHash = await godwokenClient.getScriptHash("0x0");

  const message = generateTransactionMessage(
    rawL2Tx,
    senderScriptHash,
    receiverScriptHash,
    rollupTypeHash
  );
  console.log("message:", message);

  const signature = signMessage(message, privateKey);
  console.log("signature:", signature);

  const l2tx: L2Transaction = { raw: rawL2Tx, signature };
  console.log("l2 tx:", JSON.stringify(l2tx, null, 2));

  // Submit transaction via RPC
  // const l2TxHash = await godwoken.submitL2Transaction(l2tx);
  // console.log("l2 tx hash:", l2TxHash);

  return l2tx;
}

function createAccountRawL2Transaction(
  fromId: HexNumber,
  nonce: HexNumber,
  script: Script,
  sudtId: HexNumber,
  feeAmount: HexNumber
): RawL2Transaction {
  const createAccount = {
    script,
    fee: {
      sudt_id: sudtId,
      amount: feeAmount,
    },
  };
  // Serialize MetaContractArgs, https://github.com/nervosnetwork/godwoken/blob/v0.9.0-rc3/crates/types/schemas/godwoken.mol#L224
  const enumTag = "0x00000000";
  const createAccountPart = new Reader(
    SerializeCreateAccount(NormalizeCreateAccount(createAccount))
  ).serializeJson();
  const args = enumTag + createAccountPart.slice(2);

  // to_id = 0, means MetaContract
  return {
    from_id: fromId,
    to_id: "0x0",
    nonce,
    args,
  };
}

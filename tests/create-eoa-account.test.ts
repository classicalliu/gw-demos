import test from "ava";
import { GodwokenClient } from "../src/godwoken";
import { createEoaAccount } from "../src/create-eoa-account";
import { Hash, HexNumber, HexString } from "@ckb-lumos/base";
import { L2Transaction } from "../src/normalizer";

test("createEoaAccount", async (t) => {
  const godwokenClient: GodwokenClient = new MockGodwokenClient() as any;

  const sudtId = "0x1";
  const feeAmount = "0x64";

  const privateKey =
    "0xe79f3207ea4980b7fed79956d5934249ceac4751a4fae01a0f7c4a96884bc4e3";
  const rollupTypeHash =
    "0x5f89ec4902c305573dac4ad8c9c1ae21455b9650af7088c2da770ba1a1f3350e";
  const ethAccountTypeHash =
    "0xb4109f431d0c6f74b585dec934ef369fc738c7a95c3f1d9c6dab97afcd1397e7";
  const ethAddress = "0xD1BBB255403C5dc6F6e44375fCF367131785aefa";

  const expectedL2Transaction: L2Transaction = {
    raw: {
      from_id: "0x2",
      to_id: "0x0",
      nonce: "0x8",
      args: "0x00000000890000000c0000007500000069000000100000003000000031000000b4109f431d0c6f74b585dec934ef369fc738c7a95c3f1d9c6dab97afcd1397e701340000005f89ec4902c305573dac4ad8c9c1ae21455b9650af7088c2da770ba1a1f3350ed1bbb255403c5dc6f6e44375fcf367131785aefa0100000064000000000000000000000000000000",
    },
    signature:
      "0x70d7808d77ebf88ee4a8f1b8b3fc0660afe4c0fbfacb8644474f2a7f1b905f9a79dbf146776bfd810c8c5f5fcf1ae1656ae7f99408c471d9bcc3abfdee1dd62800",
  };

  const l2Tx = await createEoaAccount(
    godwokenClient,
    privateKey,
    sudtId,
    feeAmount,
    rollupTypeHash,
    ethAccountTypeHash,
    ethAddress
  );

  t.deepEqual(l2Tx, expectedL2Transaction);
});

// Mock GodwokenClient for test
class MockGodwokenClient {
  constructor() {}

  async getNonce(): Promise<HexString> {
    return "0x8";
  }

  async getScriptHash(id: HexNumber): Promise<Hash> {
    if (id === "0x2") {
      return "0x1fa35e560933b96ee6d9c4946b4990b150b49d1339107ef70aba08231c375b81";
    } else if (id === "0x0") {
      return "0xdc75f400bcb409bf4e5fa9d3e7fcb605595bc211c5f11c3bff3006f6bf7697ea";
    }
    throw new Error("script hash not found!");
  }

  async getAccountIdByScriptHash(scriptHash: Hash): Promise<HexNumber> {
    if (
      scriptHash ===
      "0x1fa35e560933b96ee6d9c4946b4990b150b49d1339107ef70aba08231c375b81"
    ) {
      return "0x2";
    }
    throw new Error(`account id not found!`);
  }
}

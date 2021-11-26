import test from "ava";
import { GodwokenClient } from "../src/godwoken";
import { WithdrawalRequest } from "../src/normalizer";
import { withdrawal } from "../src/withdrawal";

class MockGodwokenClient {
  async getScriptHash() {
    return "0xe26198694096599ad4c2e9610678bbef57757c019b9974b56e2589cf7a63cfcf";
  }

  async getNonce() {
    return "0x2";
  }

  async getAccountIdByScriptHash() {
    return "0x6";
  }
}

test("withdraw", async (t) => {
  const mockGodwokenClient = new MockGodwokenClient();
  const rollupTypeHash =
    "0x828b8a63f97e539ddc79e42fa62dac858c7a9da222d61fc80f0d61b44b5af5d4";
  const ethAccountTypeHash =
    "0xf96d799a3c90ac8e153ddadd1747c6067d119a594f7f1c4b1fffe9db0f304335";
  const privateKey =
    "0xdd50cac37ec6dd12539a968c1a2cbedda75bd8724f7bcad486548eaabb87fc8b";
  const capacity = "0x" + 100000000000n.toString(16);
  const ownerLockHash =
    "0x3bab60cef4af81a87b0386f29bbf1dd0f6fe71c9fe1d84ca37096a6284d3bdaf";

  const expectedWithdrawRequest: WithdrawalRequest = {
    raw: {
      nonce: "0x2",
      capacity: "0x174876e800",
      amount: "0x0",
      sudt_script_hash:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      account_script_hash:
        "0xe26198694096599ad4c2e9610678bbef57757c019b9974b56e2589cf7a63cfcf",
      sell_amount: "0x0",
      sell_capacity: "0x0",
      owner_lock_hash:
        "0x3bab60cef4af81a87b0386f29bbf1dd0f6fe71c9fe1d84ca37096a6284d3bdaf",
      payment_lock_hash:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      fee: { sudt_id: "0x1", amount: "0x0" },
    },
    signature:
      "0x54f9787b6345be204df672331cecc3245d7db775069861c382e9ba6c416c9d135d288c63ab6615cfd6644bd1154d2d21bbb93cfea6bf64e5c6482f226c8c1b1f01",
  };

  const withdrawalRequest = await withdrawal(
    mockGodwokenClient as unknown as GodwokenClient,
    rollupTypeHash,
    ethAccountTypeHash,
    privateKey,
    ownerLockHash,
    capacity
  );

  t.deepEqual(withdrawalRequest, expectedWithdrawRequest);
});

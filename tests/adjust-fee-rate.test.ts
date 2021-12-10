import test from "ava";
import { adjustFeeRate } from "../src/adjust-fee-rate";
import { GodwokenClient } from "../src/godwoken";
import { FeeConfig } from "../src/types";

test("adjust fee rate", async (t) => {
  const godwokenClient: GodwokenClient = new MockGodwokenClient() as any;

  const cases = [
    {
      sudt_id: "0x1",
      fee_rate: "0x1",
      result: "0x1", // 1 = 1(fee_rate) * 1000(weight) / 1000
    },
    {
      sudt_id: "0x5",
      fee_rate: "0x64", // 100
      result: "0x3e8", // 1000 = 100(fee_rate) * 10000(weight) / 1000
    },
    {
      sudt_id: "0x6", // not exist, default weight = 1000
      fee_rate: "0x2710", // 10000
      result: "0x2710", // 10000 = 10000(fee_rate) * 1000(weight) / 1000
    },
  ];

  for (const c of cases) {
    const adjusted = await adjustFeeRate(godwokenClient, c.fee_rate, c.sudt_id);
    t.is(adjusted, c.result);
  }
});

class MockGodwokenClient {
  constructor() {}

  async getFeeConfig(): Promise<FeeConfig> {
    const feeConfig: FeeConfig = {
      meta_cycles_limit: "0x4e20",
      sudt_cycles_limit: "0x4e20",
      withdraw_cycles_limit: "0x4e20",
      sudt_fee_rate_weight: [
        {
          sudt_id: "0x1",
          fee_rate_weight: "0x3e8", // 1000
        },
        {
          sudt_id: "0x5",
          fee_rate_weight: "0x2710", // 10000
        },
      ],
    };
    return feeConfig;
  }
}

import { HexNumber } from "@ckb-lumos/base";
import { GodwokenClient } from "./godwoken";

export async function adjustFeeRate(
  godwokenClient: GodwokenClient,
  feeRate: HexNumber,
  sudtId: HexNumber = "0x1"
): Promise<HexNumber> {
  const feeConfig = await godwokenClient.getFeeConfig();

  const sudtFeeRateWeight = feeConfig.sudt_fee_rate_weight.find(
    (s) => s.sudt_id === sudtId
  );

  // if not found, weight = 1000
  const feeRateWeight = sudtFeeRateWeight?.fee_rate_weight || "0x3e8";

  const adjustedFeeRate = (BigInt(feeRate) * BigInt(feeRateWeight)) / 1000n;

  return "0x" + adjustedFeeRate.toString(16);
}

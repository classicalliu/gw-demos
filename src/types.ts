import { HexNumber } from "@ckb-lumos/base";

export interface SUDTFeeConfig {
  // uint32
  sudt_id: HexNumber;
  // uint64
  fee_rate_weight: HexNumber;
}

export interface FeeConfig {
  meta_cycles_limit: HexNumber;
  sudt_cycles_limit: HexNumber;
  withdraw_cycles_limit: HexNumber;
  sudt_fee_rate_weight: SUDTFeeConfig[];
}

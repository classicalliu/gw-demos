import { Cell, CellDep, Script, Transaction } from "@ckb-lumos/base";
import test from "ava";
import { unlock } from "../src/unlock";

// This testcase is from mainnet https://explorer.nervos.org/transaction/0xf523b0d7291aad8c6e007d368dd9383abfe351199e6d2525c4a7a7ab25afe41a
test("unlock", async (t) => {
  const lockScript: Script = {
    code_hash:
      "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
    hash_type: "type",
    args: "0xdcda76265c88e3847fb0d6eed9e6394f3e3fb63f",
  };
  const withdrawalLockDep: CellDep = {
    out_point: {
      tx_hash:
        "0x3d727bd8bb1d87ba79638b63bfbf4c9a4feb9ac5ac5a0b356f3aaf4ccb4d3a1c",
      index: "0x0",
    },
    dep_type: "code",
  };
  const withdrawalCell: Cell = {
    cell_output: {
      capacity: "0x15cafea800",
      lock: {
        code_hash:
          "0xf1717ee388b181fcb14352055c00b7ea7cd7c27350ffd1a2dd231e059dde2fed",
        args: "0x40d73f0d3c561fcaae330eabc030d8d96a9d0af36d0c5114883658a350cb9e3b1c8d97832e0f2034c1cfc015a94f212c728675ed82f16b5f95d693e7b79a8cc056abe6b114a6034d11c0a9acd29fc3a04f50ba9420023d36f018ea0e33059542855a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a8feca15000000983cacab021bdfe6ee964c126051ddd82a35cae54f897e4e0719c7d6faadcfd50000000000000000000000000000000000000000000000000000000000000000",
        hash_type: "type",
      },
      type: undefined,
    },
    data: "0x",
    out_point: {
      tx_hash:
        "0x5006fa28debb47199b2a372e0f57189f5e4bd40adba21fbcb607e8ec785aafad",
      index: "0x4",
    },
  };
  const rollupCellDep: CellDep = {
    out_point: {
      tx_hash:
        "0x78713e3532d125be3c0b500444bbec8b0d24a0fdc21811035019769b06991354",
      index: "0x0",
    },
    dep_type: "code",
  };

  const expectedResult: Transaction = {
    version: "0x0",
    cell_deps: [
      {
        out_point: {
          tx_hash:
            "0x3d727bd8bb1d87ba79638b63bfbf4c9a4feb9ac5ac5a0b356f3aaf4ccb4d3a1c",
          index: "0x0",
        },
        dep_type: "code",
      },
      {
        out_point: {
          tx_hash:
            "0x78713e3532d125be3c0b500444bbec8b0d24a0fdc21811035019769b06991354",
          index: "0x0",
        },
        dep_type: "code",
      },
    ],
    header_deps: [],
    inputs: [
      {
        since: "0x0",
        previous_output: {
          tx_hash:
            "0x5006fa28debb47199b2a372e0f57189f5e4bd40adba21fbcb607e8ec785aafad",
          index: "0x4",
        },
      },
    ],
    outputs: [
      {
        capacity: "0x15cafea800",
        lock: {
          code_hash:
            "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
          hash_type: "type",
          args: "0xdcda76265c88e3847fb0d6eed9e6394f3e3fb63f",
        },
        type: undefined,
      },
    ],
    outputs_data: ["0x"],
    witnesses: ["0x1c000000100000001c0000001c000000080000000000000004000000"],
  };

  const result = await unlock(
    lockScript,
    withdrawalLockDep,
    withdrawalCell,
    rollupCellDep
  );

  t.deepEqual(result, expectedResult);
});

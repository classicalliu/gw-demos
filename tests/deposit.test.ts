import test from "ava";
import { ethAddressToCkbLockScript } from "../src/deposit";

test("eth address => ckb lock script", (t) => {
  // from private key: 0xdd50cac37ec6dd12539a968c1a2cbedda75bd8724f7bcad486548eaabb87fc8b
  const ethAddress = "0x0c1efcca2bcb65a532274f3ef24c044ef4ab6d73";
  const fromAddress = "ckt1qyqy84gfm9ljvqr69p0njfqullx5zy2hr9kq0pd3n5";

  const capacity = "0x" + (1000n * 10n ** 8n).toString(16);
  const ethAccountTypeHash =
    "0xf96d799a3c90ac8e153ddadd1747c6067d119a594f7f1c4b1fffe9db0f304335";
  const rollupTypeHash =
    "0x828b8a63f97e539ddc79e42fa62dac858c7a9da222d61fc80f0d61b44b5af5d4";
  const depositLockTypeHash =
    "0x04498d5fc9cac4def9b0734c509caa1dead3ea91e07c8d3622e2e45cde94f4ab";

  const expectedOutput = {
    cell_output: {
      capacity: "0x174876e800",
      lock: {
        code_hash:
          "0x04498d5fc9cac4def9b0734c509caa1dead3ea91e07c8d3622e2e45cde94f4ab",
        hash_type: "type",
        args: "0x828b8a63f97e539ddc79e42fa62dac858c7a9da222d61fc80f0d61b44b5af5d4a10000001000000030000000990000003bab60cef4af81a87b0386f29bbf1dd0f6fe71c9fe1d84ca37096a6284d3bdaf69000000100000003000000031000000f96d799a3c90ac8e153ddadd1747c6067d119a594f7f1c4b1fffe9db0f3043350134000000828b8a63f97e539ddc79e42fa62dac858c7a9da222d61fc80f0d61b44b5af5d40c1efcca2bcb65a532274f3ef24c044ef4ab6d73b0040000000000c0",
      },
    },
    data: "0x",
  };

  const output = ethAddressToCkbLockScript(
    ethAddress,
    fromAddress,
    capacity,
    ethAccountTypeHash,
    rollupTypeHash,
    depositLockTypeHash
  );

  t.deepEqual(output, expectedOutput);
});

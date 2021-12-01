import test from "ava";
import { GodwokenClient } from "../src/godwoken";
import { allTypeEthAddressToAccountId } from "../src/address";

// addresses from godwoken testnet
const ethContractAddress = "0xb6CAAd292b0F0D035E04f39558e0AE04691598B5";
const ethEoaAddress = "0x8069d75814b6886ef39a5b3b0e84c3601b033480";

const ethContractAddressAccountId = "0x9078";
const ethEoaAddressAccountId = "0x2";

const creatorAccountId = "0x3";
const rollupTypeHash =
  "0x4cc2e6526204ae6a2e8fcf12f7ad472f41a1606d5b9624beebd215d780809f6a";
const ethAccountTypeHash =
  "0xdeec13a7b8e100579541384ccaf4b5223733e4a5483c3aec95ddc4c1d5ea5b22";

const godwokenClient = new GodwokenClient(
  "http://godwoken-testnet-web3-rpc.ckbapp.dev"
);

test("contract address", async (t) => {
  const accountId = await allTypeEthAddressToAccountId(
    ethContractAddress,
    ethAccountTypeHash,
    rollupTypeHash,
    creatorAccountId,
    godwokenClient
  );

  t.is(accountId, ethContractAddressAccountId);
});

test("eoa address", async (t) => {
  const accountId = await allTypeEthAddressToAccountId(
    ethEoaAddress,
    ethAccountTypeHash,
    rollupTypeHash,
    creatorAccountId,
    godwokenClient
  );

  t.is(accountId, ethEoaAddressAccountId);
});

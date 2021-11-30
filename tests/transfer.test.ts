import { Hash, HexNumber, HexString, Script, utils } from "@ckb-lumos/base";
import test from "ava";
import { RawL2Transaction } from "../src/normalizer";
import {
  generateTransactionMessage,
  ethTransactionToRawL2Transaction,
} from "../src/transfer";
import { signMessage } from "../src/helpers";
import {
  Abi,
  EthTransaction,
  Godwoker,
  RequireResult,
} from "@polyjuice-provider/base";

// ERC20 transfer ethereum transaction
// From private key: 0xdd50cac37ec6dd12539a968c1a2cbedda75bd8724f7bcad486548eaabb87fc8b
const ethTransaction: EthTransaction = {
  from: "0x0c1efcca2bcb65a532274f3ef24c044ef4ab6d73",
  to: "0x12222c3a0c226d54812226812cad6f5d0703cc62",
  gas: "0x5b8d80",
  gasPrice: "0x1",
  data: "0xa9059cbb000000000000000000000000599f0453dbe60439c58feb4c6f8ed428fc6b7ae30000000000000000000000000000000000000000000000000000000000000016",
  nonce: "0x9",
  value: "0x0",
};

/**
 * Origin tx is a ERC20 transfer tx.
 * 
 * Origin tx: {
      raw: {
        from_id: "0x6",
        to_id: "0x8",
        args: "0xffffff504f4c5900808d5b0000000000010000000000000000000000000000000000000000000000000000000000000044000000a9059cbb00000000000000000000000007dd975da27b7aedf9f31e965ce68abf07c12d070000000000000000000000000000000000000000000000000000000000000016",
        nonce: "0xb",
      },
      signature: "0x545b30a4c3937134920ed276209b800504eb3c0e291903210176a7ce5d730af9531ef404fdfc0b43cf4c187ada1f1efe657f60db9ee780ed8d123ea9e63fce3601"
    }
 */
const rawL2Transaction: RawL2Transaction = {
  from_id: "0x6",
  to_id: "0x8",
  args: "0xffffff504f4c5900808d5b0000000000010000000000000000000000000000000000000000000000000000000000000044000000a9059cbb00000000000000000000000007dd975da27b7aedf9f31e965ce68abf07c12d070000000000000000000000000000000000000000000000000000000000000016",
  nonce: "0xb",
};

test("generateTransactionMessage", (t) => {
  const senderScriptHash: Hash =
    "0xe26198694096599ad4c2e9610678bbef57757c019b9974b56e2589cf7a63cfcf";
  const receiverScriptHash: Hash =
    "0x12222c3a0c226d54812226812cad6f5d0703cc6238707789328f3a236517be31";
  const rollupTypeHash: Hash =
    "0x828b8a63f97e539ddc79e42fa62dac858c7a9da222d61fc80f0d61b44b5af5d4";

  const expectedMessage =
    "0x2f10f2dadb07fae5d7305b2dac1138797194759345f1b2b5ffe899f7650324b2";

  const message = generateTransactionMessage(
    rawL2Transaction,
    senderScriptHash,
    receiverScriptHash,
    rollupTypeHash
  );
  t.is(message, expectedMessage);

  const expectedSignature =
    "0x545b30a4c3937134920ed276209b800504eb3c0e291903210176a7ce5d730af9531ef404fdfc0b43cf4c187ada1f1efe657f60db9ee780ed8d123ea9e63fce3601";
  const signature = signMessage(
    message,
    "0xdd50cac37ec6dd12539a968c1a2cbedda75bd8724f7bcad486548eaabb87fc8b"
  );
  t.is(signature, expectedSignature);
});

test("ethTransactionToRawL2Transaction", async (t) => {
  const abiItems = require("./fixtures/IERC20.json").abi;
  const abi = new Abi(abiItems);
  const godwoker = new MockGodwoker("http://localhost:8888");

  const rawL2Tx = await ethTransactionToRawL2Transaction(
    abi,
    godwoker,
    ethTransaction
  );

  t.deepEqual(rawL2Tx, rawL2Transaction);
});

/**
 * Mocked for offline RPC call
 */
class MockGodwoker extends Godwoker {
  async getRollupTypeHash(): Promise<HexString> {
    return "0x828b8a63f97e539ddc79e42fa62dac858c7a9da222d61fc80f0d61b44b5af5d4";
  }

  async getEthAccountLockHash(): Promise<HexString> {
    return "0xf96d799a3c90ac8e153ddadd1747c6067d119a594f7f1c4b1fffe9db0f304335";
  }

  async getPolyjuiceCreatorAccountId(): Promise<HexNumber> {
    return "0x3";
  }

  async getPolyjuiceDefaultFromAddress(): Promise<HexString> {
    return "0x6daf63d8411d6e23552658e3cfb48416a6a2ca78";
  }

  async getAccountIdByEoaEthAddress(eth_address: string): Promise<HexNumber> {
    const layer2_lock: Script = {
      code_hash: this.eth_account_lock?.code_hash || "",
      hash_type: this.eth_account_lock?.hash_type as "type" | "data",
      args: this.rollup_type_hash + eth_address.slice(2),
    };
    const lock_hash = utils.computeScriptHash(layer2_lock);

    if (
      lock_hash ===
      "0xe26198694096599ad4c2e9610678bbef57757c019b9974b56e2589cf7a63cfcf"
    ) {
      return "0x6";
    }
    if (
      lock_hash ===
      "0xebf4ee1dbad3518339b996f3d4f1d480e5abbd2c941ab3bb17f70a9a314bf49e"
    ) {
      return null as any;
    }

    const errorWhenNoResult = `unable to fetch account id from ${eth_address}, lock_hash is ${lock_hash}`;
    throw new Error(errorWhenNoResult);
  }

  async getScriptHashByAccountId(account_id: number): Promise<HexString> {
    const errorWhenNoResult = `unable to fetch account script hash from 0x${BigInt(
      account_id
    ).toString(16)}`;

    if (account_id === 6) {
      return "0xe26198694096599ad4c2e9610678bbef57757c019b9974b56e2589cf7a63cfcf";
    }
    if (account_id === 8) {
      return "0x12222c3a0c226d54812226812cad6f5d0703cc6238707789328f3a236517be31";
    }
    throw new Error(errorWhenNoResult);
  }

  async getScriptHashByShortAddress(
    _address: string,
    requireResult = RequireResult.canNotBeEmpty
  ): Promise<HexString> {
    if (_address === "0xe26198694096599ad4c2e9610678bbef57757c01") {
      return "0xe26198694096599ad4c2e9610678bbef57757c019b9974b56e2589cf7a63cfcf";
    }
    if (_address === "0x07dd975da27b7aedf9f31e965ce68abf07c12d07") {
      return "0x07dd975da27b7aedf9f31e965ce68abf07c12d0773068b371a4a366425e51b24";
    }
    if (_address === "0x12222c3a0c226d54812226812cad6f5d0703cc62") {
      return "0x12222c3a0c226d54812226812cad6f5d0703cc6238707789328f3a236517be31";
    }

    if (requireResult === RequireResult.canNotBeEmpty) {
      const errorWhenNoResult = `unable to fetch script from ${_address}`;
      throw new Error(errorWhenNoResult);
    }

    return null as any;
  }

  async getNonce() {
    return "0xb";
  }

  async getAccountIdByScriptHash(script_hash: string): Promise<HexNumber> {
    if (
      script_hash ===
      "0x12222c3a0c226d54812226812cad6f5d0703cc6238707789328f3a236517be31"
    ) {
      return "0x8";
    }
    const errorWhenNoResult = `unable to fetch account id from script hash ${script_hash}`;
    throw new Error(errorWhenNoResult);
  }
}

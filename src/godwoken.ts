import { RPC, Reader } from "ckb-js-toolkit";
import { Hash, HexNumber } from "@ckb-lumos/base";
import { NormalizeWithdrawalRequest, WithdrawalRequest } from "./normalizer";
import { SerializeWithdrawalRequest } from "../schemas";

/**
 * Godwoken RPC client
 */
export class GodwokenClient {
  private rpc: RPC;

  constructor(url: string) {
    this.rpc = new RPC(url);
  }

  private async rpcCall(method_name: string, ...args: any[]): Promise<any> {
    const name = "gw_" + method_name;
    const result = await this.rpc[name](...args);
    return result;
  }

  /**
   * Serialize withdrawal request and submit to godwoken
   *
   * @param request
   * @returns
   */
  async submitWithdrawalRequest(request: WithdrawalRequest): Promise<void> {
    const data = new Reader(
      SerializeWithdrawalRequest(NormalizeWithdrawalRequest(request))
    ).serializeJson();
    return await this.rpcCall("submit_withdrawal_request", data);
  }

  /**
   *
   * @param scriptHash layer2 lock script hash
   * @returns uint32
   */
  async getAccountIdByScriptHash(
    scriptHash: Hash
  ): Promise<HexNumber | undefined> {
    const id = await this.rpcCall("get_account_id_by_script_hash", scriptHash);
    return id;
  }

  /**
   *
   * @param accountId uint32 in hex number
   * @returns uint32 in hex number
   */
  async getNonce(accountId: HexNumber): Promise<HexNumber> {
    const nonce = await this.rpcCall("get_nonce", accountId);
    return nonce;
  }

  /**
   *
   * @param accountId uint32 in hex number
   * @returns
   */
  async getScriptHash(accountId: HexNumber): Promise<Hash> {
    return await this.rpcCall("get_script_hash", accountId);
  }
}

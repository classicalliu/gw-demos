import {
  Script,
  CellDep,
  Cell,
  WitnessArgs,
  core,
  Transaction,
} from "@ckb-lumos/base";
import {
  createTransactionFromSkeleton,
  TransactionSkeleton,
} from "@ckb-lumos/helpers";
import { normalizers, Reader } from "ckb-js-toolkit";
import { SerializeUnlockWithdrawalViaFinalize } from "../schemas";
import { NormalizeUnlockWithdrawalViaFinalize } from "./normalizer";

/**
 *
 * @param lockScript account layer1 lock script
 * @param withdrawalLockDep withdrawal lock script cell dep, for example: https://github.com/nervosnetwork/godwoken-public/blob/master/testnet/config/scripts-deploy-result.json#L24-L28
 * @param withdrawalCell found this cell by indexer, this is the `withdrawal` output cell.
 * @param rollupCellDep The roll up cell out point, find roll up cell by indexer.
 * @param sudtScript If sudt, fill with sudt script
 * @param sudtCellDep If sudt, fill with sudt cell dep
 * @returns
 */
export async function unlock(
  lockScript: Script,
  withdrawalLockDep: CellDep,
  withdrawalCell: Cell,
  rollupCellDep: CellDep,

  sudtScript?: Script,
  sudtCellDep?: CellDep
): Promise<Transaction> {
  // The output cell
  const outputCell: Cell = {
    cell_output: {
      capacity: withdrawalCell.cell_output.capacity,
      lock: lockScript,
      type: withdrawalCell.cell_output.type,
    },
    data: withdrawalCell.data,
  };

  // * Build UnlockWithdrawal::UnlockWithdrawalViaFinalize and put into withess
  // serialize UnlockWithdrawalViaFinalize
  const data =
    "0x00000000" +
    new Reader(
      SerializeUnlockWithdrawalViaFinalize(
        NormalizeUnlockWithdrawalViaFinalize({})
      )
    )
      .serializeJson()
      .slice(2);
  console.log("withdrawal_witness:", data);
  const newWitnessArgs: WitnessArgs = {
    lock: data,
  };
  const withdrawalWitness = new Reader(
    core.SerializeWitnessArgs(normalizers.NormalizeWitnessArgs(newWitnessArgs))
  ).serializeJson();

  let txSkeleton = TransactionSkeleton({ cellProvider: null });
  txSkeleton = txSkeleton
    .update("inputs", (inputs) => {
      return inputs.push(withdrawalCell);
    })
    .update("outputs", (outputs) => {
      return outputs.push(outputCell);
    })
    .update("cellDeps", (cell_deps) => {
      return cell_deps.push(withdrawalLockDep);
    })
    .update("cellDeps", (cell_deps) => {
      return cell_deps.push(rollupCellDep);
    })
    .update("witnesses", (witnesses) => {
      return witnesses.push(withdrawalWitness);
    });

  if (!!sudtScript) {
    txSkeleton = txSkeleton.update("cellDeps", (cell_deps) => {
      return cell_deps.push(sudtCellDep!);
    });
  }

  console.log("txSkeleton:", JSON.stringify(txSkeleton.toJS(), null, 2));

  let tx: Transaction = createTransactionFromSkeleton(txSkeleton);
  console.log("tx:", JSON.stringify(tx, null, 2));
  return tx;
}

/**
 * This method aims to get the rollup cell by rollup_type_script
 * Just show how to do this in lumos
 */
// export async function getRollupCell(indexer: Indexer, rollupTypeScript: Script) {
//   const rollupCollector = new CellCollector(indexer, {
//     type: rollupTypeScript,
//   });
//   let rollupCell: Cell | undefined = undefined;
//   for await (const cell of rollupCollector.collect()) {
//     rollupCell = cell;
//     break;
//   }

//   if (rollupCell == null) {
//     throw new Error("rollup cell not found")
//   }

//   return rollupCell
// }

/**
 * This method shows how to get withdarwal cell by lumos indexer
 *
 * @param withdrawalLockTypeHash for example: https://github.com/nervosnetwork/godwoken-public/blob/master/testnet/config/scripts-deploy-result.json#L33
 * @param rollupTypeHash
 * @param lockScriptHash
 * @param rollupCell
 * @param sudtScript
 * @returns
 */
// export async function getWithdrawalCell(
//   withdrawalLockTypeHash: Script,
//   rollupTypeHash: Hash,
//   lockScriptHash: Hash,
//   rollupCell: Cell,
//   sudtScript?: Script
// ) {
//   const globalState = new GlobalState(new Reader(rollupCell.data));
//   const last_finalized_block_number = globalState
//     .getLastFinalizedBlockNumber()
//     .toLittleEndianBigUint64();
//   console.log("last finalized block number:", last_finalized_block_number)

// * search withdrawal locked cell by:
//   - withdrawal lock code hash (type)
//   - owner secp256k1 blake2b160 lock hash
//   - last_finalized_block_number
//   - TODO: withdrawal_block_hash (to proof the block is on current rollup)
//   const withdrawalCollector = new CellCollector(indexer, {
//     lock: {
//       code_hash: withdrawalLockTypeHash,
//       hash_type: "type",
//       args: rollupTypeHash, // prefix search
//     },
//     type: sudtScript ? sudtScript : "empty",
//     argsLen: "any",
//   });
//   const withdrawalCells = [];
//   for await (const cell of withdrawalCollector.collect()) {
//     const lockArgs = cell.cell_output.lock.args;
// Remove rollup type hash prefix(32 Bytes)
//     const withdrawalLockArgsData = "0x" + lockArgs.slice(66);
//     const withdrawalLockArgs = new WithdrawalLockArgs(
//       new Reader(withdrawalLockArgsData)
//     );
//     const ownerLockHash = new Reader(
//       withdrawalLockArgs.getOwnerLockHash().raw()
//     ).serializeJson();
//     if (ownerLockHash !== lockScriptHash) {
//       continue;
//     }

//     console.log("[DEBUG]: withdrawalCell:", cell);

//     const withdrawal_block_number = withdrawalLockArgs
//       .getWithdrawalBlockNumber()
//       .toLittleEndianBigUint64();
//     console.log("withdrawal_block_number", withdrawal_block_number);

//     // withdrawal block number must be bigger than last finalized block number
//     if (withdrawal_block_number > last_finalized_block_number) {
//       console.log("[INFO]: withdrawal cell not finalized");
//       continue;
//     }

//     withdrawalCells.push(cell);
//   }
//   if (withdrawalCells.length == 0) {
//     throw new Error("No valid withdrawal cell found")
//   }
//   console.log(
//     `[INFO] found ${withdrawalCells.length} withdrawal cells, only process first one`
//   );
//   const withdrawalCell = withdrawalCells[0];

//   return withdrawalCell
// }

import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";

// noinspection DuplicatedCode
/**
 * This transaction transfers flow tokens from one vault to another.
 *
 * @param owner the flow tokens owner
 * @param recipient the flow tokens recipient
 * @param amount the amount of flow tokens to transfer
 */
export function transferFlow(owner: string, recipient: string, amount: string): (CadenceEngine) => Promise<void> {
    if (!/^-?\d+(\.\d+)$/.test(amount))
        throw Error("invalid amount found");
    if (owner.length == 0)
        throw Error("invalid owner address found");
    if (recipient.length == 0)
        throw Error("invalid buyer address found");

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth(owner);
        const code = engine.getCode("transactions/flow/transfer-flow");

        // noinspection DuplicatedCode
        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(auth),
            fcl.proposer(auth),
            fcl.authorizations([auth]),
            fcl.limit(1000),
            fcl.args([
                fcl.arg(recipient, t.Address),
                fcl.arg(amount, t.UFix64)
            ])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed().then(_ => {
               return engine.getListener().onTransferFlow(txId, owner, recipient, amount);
            }))
    }
}

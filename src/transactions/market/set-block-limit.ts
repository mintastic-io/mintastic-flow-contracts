import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";

/**
 * This transaction is used to set the block limit of the block registry.
 *
 * @param blockLimit the id of the bid to accept
 */
export function setBlockLimit(blockLimit: number): (CadenceEngine) => Promise<void> {
    if (blockLimit <= 0)
        throw Error("amount must be greater than zero");

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth();
        const code = engine.getCode("transactions/market/set-block-limit");

        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(auth),
            fcl.proposer(auth),
            fcl.authorizations([auth]),
            fcl.limit(1000),
            fcl.args([
                fcl.arg(blockLimit, t.UInt64)
            ])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed())
    }
}

import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../cadence-engine";

/**
 * This transaction is used to lock a series so that no more assets of the same series
 * can be created.
 *
 * @param creatorId the owner id of the series
 * @param series the series identifier
 */
export function lockSeries(creatorId: string, series: number): (CadenceEngine) => Promise<void> {
    if (creatorId.length === 0)
        throw Error("creator id must not be empty");
    if (series < 0)
        throw Error("the series identifier must be greater than or equals zero")

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth();
        const code = engine.getCode("transactions/nft/lock-series");

        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(auth),
            fcl.proposer(auth),
            fcl.authorizations([auth]),
            fcl.limit(100),
            fcl.args([
                fcl.arg(creatorId, t.String),
                fcl.arg(series, t.UInt16)
            ])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed())
    }
}
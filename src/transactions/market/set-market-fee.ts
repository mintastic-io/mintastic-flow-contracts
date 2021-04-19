import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../cadence-engine";

/**
 * This transaction is used to set the market fee for service shares.
 *
 * @param key the threshold price
 * @param value the market fee
 */
export function setMarketFee(key: string, value: string): (CadenceEngine) => Promise<void> {
    if (!/^-?\d+(\.\d+)$/.test(key))
        throw Error("key must be greater than zero");
    if (!/^-?\d+(\.\d+)$/.test(value))
        throw Error("value must be greater than zero");

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth();
        const code = engine.getCode("transactions/market/set-market-fee");

        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(auth),
            fcl.proposer(auth),
            fcl.authorizations([auth]),
            fcl.limit(1000),
            fcl.args([
                fcl.arg(key, t.UFix64),
                fcl.arg(value, t.UFix64)
            ])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed())
    }
}

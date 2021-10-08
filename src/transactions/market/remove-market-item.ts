import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";

/**
 * This transaction removes a market item from a market store.
 * The transaction is invoked by the market item owner.
 *
 * @param owner the owner of the market item
 * @param assetId the asset id of the market item
 */
export function removeMarketItem(owner: string, assetId: string): (CadenceEngine) => Promise<void> {
    if (owner.length == 0)
        throw Error("invalid owner address found");
    if (assetId.length == 0)
        throw Error("invalid asset id found");

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth(owner);
        const code = engine.getCode("transactions/market/remove-market-item");

        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(auth),
            fcl.proposer(auth),
            fcl.authorizations([auth]),
            fcl.limit(1000),
            fcl.args([
                fcl.arg(assetId, t.String)
            ])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed().then(_ => {
                return engine.getListener().onRemoveMarketItem(txId, owner, assetId);
            }))
    }
}

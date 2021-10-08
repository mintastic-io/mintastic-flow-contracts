import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";

/**
 * This transaction is used to lock a nft market item.
 * The transaction is invoked by mintastic.
 *
 * @param owner the owner of the market item
 * @param assetId the asset id of the market item
 */
export function lockMarketItem(owner: string, assetId: string): (CadenceEngine) => Promise<void> {
    if (owner.length == 0)
        throw Error("invalid owner address found");
    if (assetId.length == 0)
        throw Error("invalid asset id found");

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth();
        const code = engine.getCode("transactions/market/lock-market-item");

        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(auth),
            fcl.proposer(auth),
            fcl.authorizations([auth]),
            fcl.limit(1000),
            fcl.args([
                fcl.arg(owner, t.Address),
                fcl.arg(assetId, t.String)
            ])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed().then(_ => {
                return engine.getListener().onLockMarketItem(txId, owner, assetId);
            }))
    }
}

import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";

/**
 * This transaction is used to reject a bid on a market item.
 * The transaction is invoked by the market item owner.
 *
 * @param owner the owner of the market item
 * @param assetId the asset id of the market item
 * @param bidId the id of the bid to accept
 */
export function rejectBid(owner: string, assetId: string, bidId: number): (CadenceEngine) => Promise<void> {
    if (owner.length == 0)
        throw Error("invalid owner address found");
    if (assetId.length == 0)
        throw Error("invalid asset id found");
    if (bidId < 0)
        throw Error("amount must be greater than or equal zero");

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth(owner);
        const code = engine.getCode("transactions/market/reject-bid");

        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(auth),
            fcl.proposer(auth),
            fcl.authorizations([auth]),
            fcl.limit(1000),
            fcl.args([
                fcl.arg(owner, t.Address),
                fcl.arg(assetId, t.String),
                fcl.arg(bidId, t.UInt64)
            ])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed().then(_ => {
                return engine.getListener().onRejectBid(txId, owner, assetId, bidId);
            }))
    }
}

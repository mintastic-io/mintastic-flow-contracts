import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../cadence-engine";

/**
 * This transaction is used to change the price of a market item.
 * The transaction is invoked by the market item owner.
 *
 * @param owner the owner of the market item
 * @param assetId the asset id of the market item
 * @param bidId the id of the bid to accept
 */
export function setItemPrice(owner: string, assetId: string): (CadenceEngine) => Promise<void> {
    if (owner.length == 0)
        throw Error("invalid owner address found");
    if (assetId.length == 0)
        throw Error("invalid asset id found");

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth(owner);
        const code = engine.getCode("transactions/market/set-item-price");

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
            .then(txId => fcl.tx(txId).onceSealed())
    }
}

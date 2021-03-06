import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";
import {Shares} from "../../types";

/**
 * This transaction creates a list offering based market item.
 * A list offering uses a list of token ids which are already minted.
 * The transaction is invoked by the market item owner.
 *
 * @param owner the owner of the market item
 * @param assetId the asset id of the market item
 * @param price the price of the market item
 * @param shares the payment recipient shares
 */
export function createListOffer(owner: string, assetId: string, price: string, shares: Shares): (CadenceEngine) => Promise<void> {
    if (owner.length === 0)
        throw Error("invalid owner address found");
    if (assetId.length === 0)
        throw Error("invalid asset id found");
    if (shares.length === 0)
        throw Error("no shares found")
    if (!/^-?\d+(\.\d+)$/.test(price))
        throw Error("invalid price found");

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth(owner);
        const code = engine.getCode("transactions/market/create-list-offer");

        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(auth),
            fcl.proposer(auth),
            fcl.authorizations([auth]),
            fcl.limit(100),
            fcl.args([
                fcl.arg(assetId, t.String),
                fcl.arg(price, t.UFix64),
                fcl.arg(
                    shares.map(e => ({key: e.creatorId, value: e.share})),
                    t.Dictionary({key: t.String, value: t.UFix64})
                )
            ])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed())
            .then(e => e.events.find((d) => d.type.endsWith("MintasticMarket.MarketItemInserted")))
            .then(e => engine.getListener().onCreateListOffer(e.txId, owner, assetId, price, shares).then(_ => e.data));
    }
}
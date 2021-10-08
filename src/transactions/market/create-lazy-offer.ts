import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";
import {Shares} from "../../types";

/**
 * This transaction creates a lazy offering based market item.
 * A lazy offering uses a nft minter to mint tokens on the fly.
 * The transaction is invoked by mintastic.
 *
 * @param assetId the asset id of the market item
 * @param price the price of the market item
 * @param shares the market item shares
 */
export function createLazyOffer(assetId: string, price: string, shares: Shares): (CadenceEngine) => Promise<void> {
    if (assetId.length === 0)
        throw Error("invalid asset id found");
    if (shares.length === 0)
        throw Error("no shares found")
    if (!/^-?\d+(\.\d+)$/.test(price))
        throw Error("invalid price found");

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth();
        const code = engine.getCode("transactions/market/create-lazy-offer");

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
            .then(e => engine.getListener().onCreateLazyOffer(e.txId, assetId, price, shares).then(_ => e.data));
    }
}
import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";
import {Addresses} from "../../types";

/**
 * This transaction creates a list offering based market item.
 * A list offering uses a list of token ids which are already minted.
 * The transaction is invoked by the market item owner.
 *
 * @param owner the owner of the market item
 * @param assetId the asset id of the market item
 * @param price the price of the market item
 * @param addresses the payment recipient addresses (optional)
 */
export function createListOffer(owner: string, assetId: string, price: string, addresses?: Addresses): (CadenceEngine) => Promise<void> {
    if (owner.length == 0)
        throw Error("invalid owner address found");
    if (assetId.length == 0)
        throw Error("invalid asset id found");
    if (!/^-?\d+(\.\d+)$/.test(price))
        throw Error("invalid price found");

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth(owner);
        const code = engine.getCode("transactions/market/create-list-offer");

        const recipients = addresses ? addresses : [{address: owner, share: "1.0"}]

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
                    recipients.map(e => {
                        return {key: e.address, value: e.share}
                    }),
                    t.Dictionary({key: t.Address, value: t.UFix64})
                ),
            ])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed())
    }
}
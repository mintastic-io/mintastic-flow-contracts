import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../cadence-engine";

// noinspection DuplicatedCode
/**
 * This transaction bids for a NFT by creating mintastic credits on the fly offering a fiat payment.
 * Due to the off-chain characteristics of this bid method, the mintastic contract owner issues this transaction.
 *
 * @param owner the owner of the market item
 * @param buyer the buyer of the market item
 * @param assetId the asset id of the market item
 * @param price the price of the market item
 * @param amount the number of times the item should be purchased
 */
export function bidWithFiat(owner: string, buyer: string, assetId: string, price: string, amount: number): (CadenceEngine) => Promise<void> {
    if (!/^-?\d+(\.\d+)$/.test(price))
        throw Error("invalid price found");
    if (owner.length == 0)
        throw Error("invalid owner address found");
    if (buyer.length == 0)
        throw Error("invalid buyer address found");
    if (assetId.length == 0)
        throw Error("invalid asset id found");
    if (amount <= 0)
        throw Error("amount must be greater than zero");

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth();
        const code = engine.getCode("transactions/market/bid");

        // noinspection DuplicatedCode
        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(auth),
            fcl.proposer(auth),
            fcl.authorizations([auth]),
            fcl.limit(1000),
            fcl.args([
                fcl.arg(owner, t.Address),
                fcl.arg(buyer, t.Address),
                fcl.arg(assetId, t.String),
                fcl.arg(price, t.UFix64),
                fcl.arg(amount, t.UInt16)
            ])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed())
    }
}

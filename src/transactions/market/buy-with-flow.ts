import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../cadence-engine";

// noinspection DuplicatedCode
/**
 * This transaction purchases a NFT by exchanging flow tokens to mintastic credits on the fly.
 * Due to the flow token vault interaction of this payment method, the vault owner issues this transaction.
 *
 * @param owner
 * @param buyer
 * @param assetId
 * @param price
 * @param amount
 */
export function buyWithFlow(owner: string, buyer: string, assetId: string, price: string, amount: number): (CadenceEngine) => Promise<void> {
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
        const auth = engine.getAuth(buyer);
        const code = engine.getCode("transactions/market/buy-with-flow");

        // noinspection DuplicatedCode
        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(auth),
            fcl.proposer(auth),
            fcl.authorizations([auth]),
            fcl.limit(1000),
            fcl.args([
                fcl.arg(owner, t.Address),
                fcl.arg(assetId, t.String),
                fcl.arg(price, t.UFix64),
                fcl.arg(amount, t.UInt16)
            ])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed())
    }
}

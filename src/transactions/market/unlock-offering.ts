import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../cadence-engine";

/**
 * This transaction is used to unlock an nft offering of a market item.
 * The transaction is invoked by mintastic.
 *
 * @param owner the owner of the market item
 * @param assetId the asset id of the market item
 * @param amount the amount of items to lock
 */
export function unlockOffering(owner: string, assetId: string, amount: number): (CadenceEngine) => Promise<void> {
    if (owner.length == 0)
        throw Error("invalid owner address found");
    if (assetId.length == 0)
        throw Error("invalid asset id found");
    if (amount < 0)
        throw Error("amount must be greater than or equal zero");

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth();
        const code = engine.getCode("transactions/market/unlock-offering");

        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(auth),
            fcl.proposer(auth),
            fcl.authorizations([auth]),
            fcl.limit(1000),
            fcl.args([
                fcl.arg(owner, t.Address),
                fcl.arg(assetId, t.String),
                fcl.arg(amount, t.UInt16)
            ])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed())
    }
}

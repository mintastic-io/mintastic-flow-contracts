import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";

/**
 * This transaction is used to transfer a NFT from the mintastic collection to an other address.
 *
 * @param buyer the recipient address
 * @param assetId the asset id of the token to transfer
 * @param amount the amount of tokens to transfer
 */
export function transfer(buyer: string, assetId: string, amount: number): (CadenceEngine) => Promise<void> {
    if (buyer.length == 0)
        throw Error("invalid buyer address found");
    if (assetId.length == 0)
        throw Error("invalid asset id found");
    if (amount < 0)
        throw Error("amount must be greater than or equal zero");

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth();
        const code = engine.getCode("transactions/nft/transfer");

        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(auth),
            fcl.proposer(auth),
            fcl.authorizations([auth]),
            fcl.limit(100),
            fcl.args([
                fcl.arg(buyer, t.Address),
                fcl.arg(assetId, t.String),
                fcl.arg(amount, t.UInt16)
            ])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed())
    }
}

export interface Asset {
    assetId: string
    creatorId: string
    addresses: { address: string, share: string }[]
    content: string
    royalty: string
    series: number
    type: number
}
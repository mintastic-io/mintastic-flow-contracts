import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";

/**
 * This transaction is used to mint new tokens of an registered asset.
 *
 * @param recipient the token recipient address
 * @param assetId the id of the asset to mint
 * @param amount the amount of tokens to mint
 */
export function mint(recipient: string, assetId: string, amount: number): (CadenceEngine) => Promise<{}> {
    if (recipient.length === 0)
        throw Error("recipient address must not be empty");
    if (assetId.length === 0)
        throw Error("asset id must not be empty");
    if (amount <= 0)
        throw Error("the amount must be greater than zero")

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth();
        const code = engine.getCode("transactions/nft/mint");

        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(auth),
            fcl.proposer(auth),
            fcl.authorizations([auth]),
            fcl.limit(1000),
            fcl.args([
                fcl.arg(recipient, t.Address),
                fcl.arg(assetId, t.String),
                fcl.arg(amount, t.UInt16)
            ])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed())
            .then(e => e.events.find((d) => d.type.endsWith("MintasticNFT.Mint")))
            .then(e => e.data);
    }
}
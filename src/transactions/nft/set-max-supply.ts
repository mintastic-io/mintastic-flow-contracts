import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";

/**
 * This transaction sets the max supply of an already registered asset.
 *
 * @param assetId the asset id
 * @param supply the max supply
 */
export function setMaxSupply(assetId: string, supply: number): (CadenceEngine) => Promise<void> {
    if (assetId.length == 0)
        throw Error("invalid asset id found");
    if (supply <= 0)
        throw Error("supply must be greater than zero");

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth();
        const code = engine.getCode("transactions/nft/set-max-supply");

        // noinspection DuplicatedCode
        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(auth),
            fcl.proposer(auth),
            fcl.authorizations([auth]),
            fcl.limit(100),
            fcl.args([
                fcl.arg(assetId, t.String),
                fcl.arg(supply, t.UInt16)
            ])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed().then(_ => {
                return engine.getListener().onSetMaxSupply(txId, assetId, supply);
            }))
    }
}
import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";

/**
 * This script is used to read all bids of an market item offer related
 * to the given address and asset id.
 *
 * @param owner the address of the market item owner
 * @param assetId the id of the asset
 */
export function readBids(owner: string, assetId: string): (CadenceEngine) => Promise<number[]> {
    if (owner.length === 0)
        throw Error("address must not be empty");
    if (assetId.length === 0)
        throw Error("assetId must not be empty");

    return (engine: CadenceEngine) => {
        const code = engine.getCode("scripts/market/read-bids");

        return fcl
            .send([
                fcl.script`${code}`,
                fcl.args([
                    fcl.arg(owner, t.Address),
                    fcl.arg(assetId, t.String)
                ]),
            ])
            .then(fcl.decode)
    }
}
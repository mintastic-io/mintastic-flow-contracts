import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";

/**
 * This script is used to read the supply of the market item with
 * to given address and asset id.
 *
 * @param address the address of the market item owner
 * @param assetId the id of the asset
 */
export function readItemSupply(address: string, assetId: string): (CadenceEngine) => Promise<number> {
    if (address.length === 0)
        throw Error("address must not be empty");
    if (assetId.length === 0)
        throw Error("assetId must not be empty");

    return (engine: CadenceEngine) => {
        const code = engine.getCode("scripts/market/read-item-supply");

        return fcl
            .send([
                fcl.script`${code}`,
                fcl.args([
                    fcl.arg(address, t.Address),
                    fcl.arg(assetId, t.String)
                ]),
            ])
            .then(fcl.decode)
    }
}
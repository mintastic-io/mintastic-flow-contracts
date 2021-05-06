import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";

/**
 * This script is used to read the asset ids of a market store.
 *
 * @param address the address of the market item owner
 */
export function readStoreAssetId(address: string): (CadenceEngine) => Promise<string[]> {
    if (address.length === 0)
        throw Error("address must not be empty");

    return (engine: CadenceEngine) => {
        const code = engine.getCode("scripts/market/read-store-asset-ids");

        return fcl
            .send([
                fcl.script`${code}`,
                fcl.args([
                    fcl.arg(address, t.Address)
                ]),
            ])
            .then(fcl.decode)
    }
}
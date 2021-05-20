import * as fcl from "@onflow/fcl"
import {CadenceEngine} from "../../engine/cadence-engine";
import * as t from "@onflow/types"

export function readOwnedAssets(address: string): (CadenceEngine) => Promise<{string: {number:string}}> {
    return (engine: CadenceEngine) => {
        const code = engine.getCode("scripts/nft/read-owned-assets");

        return fcl
            .send([
                fcl.script`${code}`,
                fcl.args([fcl.arg(address, t.Address)]),
            ])
            .then(fcl.decode)
    }
}
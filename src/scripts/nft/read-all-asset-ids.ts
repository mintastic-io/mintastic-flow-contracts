import * as fcl from "@onflow/fcl"
import {CadenceEngine} from "../../engine/cadence-engine";

export function readAllAssetIds(): (CadenceEngine) => Promise<string[]> {
    return (engine: CadenceEngine) => {
        const code = engine.getCode("scripts/nft/read-all-asset-ids");

        return fcl
            .send([fcl.script`${code}`, fcl.args([])])
            .then(fcl.decode)
    }
}
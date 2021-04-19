import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../cadence-engine";

export function readCollectorAssetIds(address: string): (CadenceEngine) => Promise<string[]> {
    return (engine: CadenceEngine) => {
        const code = engine.getCode("scripts/nft/read-collector-asset-ids");

        return fcl
            .send([
                fcl.script`${code}`,
                fcl.args([fcl.arg(address, t.Address)]),
            ])
            .then(fcl.decode)
    }
}
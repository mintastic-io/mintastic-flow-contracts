import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";

export function readAssetIds(address: string): (CadenceEngine) => Promise<string[]> {
    if (address.length === 0)
        throw Error("address must not be empty");

    return (engine: CadenceEngine) => {
        const code = engine.getCode("scripts/account/read-asset-ids");

        return fcl
            .send([
                fcl.script`${code}`,
                fcl.args([fcl.arg(address, t.Address)])
            ])
            .then(fcl.decode)
    }
}
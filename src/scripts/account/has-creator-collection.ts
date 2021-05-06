import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";

export function hasCreatorCollection(address: string): (CadenceEngine) => Promise<boolean> {
    return (engine: CadenceEngine) => {
        const code = engine.getCode("scripts/account/has-creator-collection");

        return fcl
            .send([
                fcl.script`${code}`,
                fcl.args([fcl.arg(address, t.Address)]),
            ])
            .then(fcl.decode)
    }
}
import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";

export function readTokenIds(address: string): (CadenceEngine) => Promise<number[]> {
    if (address.length === 0)
        throw Error("address must not be empty");

    return (engine: CadenceEngine) => {
        const code = engine.getCode("scripts/account/read-token-ids");

        return fcl
            .send([
                fcl.script`${code}`,
                fcl.args([fcl.arg(address, t.Address)])
            ])
            .then(fcl.decode)
    }
}
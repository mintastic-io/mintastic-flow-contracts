import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";

export function readNextSeries(creatorId: string): (CadenceEngine) => Promise<number> {
    return (engine: CadenceEngine) => {
        const code = engine.getCode("scripts/nft/read-next-series");

        return fcl
            .send([
                fcl.script`${code}`,
                fcl.args([fcl.arg(creatorId, t.String)]),
            ])
            .then(fcl.decode)
    }
}
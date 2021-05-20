import * as fcl from "@onflow/fcl"
import {CadenceEngine} from "../../engine/cadence-engine";
import * as t from "@onflow/types"

type Result = {maxSupply: number, curSupply: number};
export function readSupply(assetId: string): (CadenceEngine) => Promise<Result> {
    return (engine: CadenceEngine) => {
        const code = engine.getCode("scripts/nft/read-supply");

        return fcl
            .send([fcl.script`${code}`, fcl.args([
                fcl.arg(assetId, t.String)
            ])])
            .then(fcl.decode)
    }
}
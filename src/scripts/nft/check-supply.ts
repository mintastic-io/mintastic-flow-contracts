import * as fcl from "@onflow/fcl"
import {CadenceEngine} from "../../engine/cadence-engine";
import * as t from "@onflow/types"

export function checkSupply(assetId: string, amount: number): (CadenceEngine) => Promise<boolean> {
    return (engine: CadenceEngine) => {
        const code = engine.getCode("scripts/nft/check-supply");

        return fcl
            .send([fcl.script`${code}`, fcl.args([
                fcl.arg(assetId, t.String),
                fcl.arg(amount, t.UInt16)
            ])])
            .then(fcl.decode)
    }
}
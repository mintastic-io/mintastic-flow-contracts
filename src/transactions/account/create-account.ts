import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";
import {pubFlowKey} from "../../crypto";

export function createAccount(): (CadenceEngine) => Promise<string> {
    return (engine: CadenceEngine) => {
        const auth = engine.getAuth();
        const code = engine.getCode("transactions/account/create-account");

        return pubFlowKey().then(pubKey => {
            return fcl.send([
                fcl.transaction`${code}`,
                fcl.limit(999),
                fcl.proposer(auth),
                fcl.payer(auth),
                fcl.authorizations([auth]),
                fcl.args([fcl.arg(pubKey, t.String)]),
            ])
        })
            .then(response => fcl.tx(response).onceExecuted())
            .then(e => e.events.find((d) => d.type === "flow.AccountCreated"))
            .then(e => e.data.address);
    }
}
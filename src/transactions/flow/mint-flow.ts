import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../cadence-engine";


export function mintFlow(recipient: string, amount: string): (CadenceEngine) => Promise<void> {
    if (recipient.length == 0)
        throw Error("invalid recipient address found");
    if (!/^-?\d+(\.\d+)$/.test(amount))
        throw Error("invalid amount value");

    return (engine: CadenceEngine) => {
        const flow = engine.getAuth("0xf8d6e0586b0a20c7");
        const auth = engine.getAuth(recipient);
        const code = engine.getCode("transactions/flow/mint-flow");

        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(flow),
            fcl.proposer(flow),
            fcl.authorizations([flow]),
            fcl.limit(1000),
            fcl.args([
                fcl.arg(recipient, t.Address),
                fcl.arg(amount, t.UFix64)
            ])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed())
    }
}

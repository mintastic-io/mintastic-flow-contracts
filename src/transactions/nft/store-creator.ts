import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";

/**
 * This transaction is used to register a creator with its corresponding address.
 *
 * @param creatorId the creator id
 * @param address the address of the creator
 */
export function storeCreator(creatorId: string, address: string): (CadenceEngine) => Promise<void> {
    if (creatorId == undefined)
        throw Error("the creatorId must not be undefined")
    if (address == undefined)
        throw Error("the address must not be undefined")

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth();
        const code = engine.getCode("transactions/nft/store-creator");

        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(auth),
            fcl.proposer(auth),
            fcl.authorizations([auth]),
            fcl.limit(100),
            fcl.args([
                fcl.arg(creatorId, t.String),
                fcl.arg(address, t.Address)
            ])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed())
            .then()
    }
}

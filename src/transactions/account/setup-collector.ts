import * as fcl from "@onflow/fcl"
import {CadenceEngine} from "../../cadence-engine";

/**
 * This transaction setup a collector account so that an account address is able
 * to collect mintastic NFTs.
 *
 * @param address the target address to initialize
 */
export function setupCollector(address: string): (CadenceEngine) => Promise<void> {
    if (address.length == 0)
        throw Error("invalid address found");

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth(address);
        const code = engine.getCode("transactions/account/setup-collector");

        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(auth),
            fcl.proposer(auth),
            fcl.authorizations([auth]),
            fcl.limit(35)
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed())
    }
}
import * as fcl from "@onflow/fcl"
import {CadenceEngine} from "../../engine/cadence-engine";

/**
 * This transaction setup a collector account so that an account address is able
 * to sell mintastic NFTs.
 *
 * @param address the target address to initialize
 */
export function setupCreator(address: string): (CadenceEngine) => Promise<void> {
    if (address.length == 0)
        throw Error("invalid address found");

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth(address);
        const code = engine.getCode("transactions/account/setup-creator");

        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(auth),
            fcl.proposer(auth),
            fcl.authorizations([auth]),
            fcl.limit(35),
            fcl.args([])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed().then(_ => {
               return engine.getListener().onCreateAccount(txId, address);
            }))
    }
}
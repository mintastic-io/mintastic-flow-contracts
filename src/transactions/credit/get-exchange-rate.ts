import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";

/**
 * This transaction is used to invoke the getExchangeRate function of an PaymentExchange instance in order
 * to update the exchange rate via the lazy block height based exchange rate update mechanism.
 * The transaction is invoked by mintastic.
 *
 * @param currency the name of the currency
 */
export function getExchangeRate(currency: string): (CadenceEngine) => Promise<void> {
    if (currency.length == 0)
        throw Error("invalid currency found");

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth();
        const code = engine.getCode("transactions/credit/get-exchange-rate");

        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(auth),
            fcl.proposer(auth),
            fcl.authorizations([auth]),
            fcl.limit(1000),
            fcl.args([
                fcl.arg(currency, t.String)
            ])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed())
    }
}

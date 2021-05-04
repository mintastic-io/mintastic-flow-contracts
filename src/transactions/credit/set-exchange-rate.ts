import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../cadence-engine";

/**
 * This transaction is used to change the exchange rate of an PaymentExchange instance.
 * The transaction is invoked by mintastic.
 *
 * @param currency the name of the currency
 * @param exchangeRate the exchange rate to set
 */
export function setExchangeRate(currency: string, exchangeRate: string): (CadenceEngine) => Promise<void> {
    if (currency.length == 0)
        throw Error("invalid currency found");
    if (!/^-?\d+(\.\d+)$/.test(exchangeRate))
        throw Error("invalid asset id found");

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth();
        const code = engine.getCode("transactions/credit/set-exchange-rate");

        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(auth),
            fcl.proposer(auth),
            fcl.authorizations([auth]),
            fcl.limit(1000),
            fcl.args([
                fcl.arg(currency, t.String),
                fcl.arg(exchangeRate, t.UFix64)
            ])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed())
    }
}

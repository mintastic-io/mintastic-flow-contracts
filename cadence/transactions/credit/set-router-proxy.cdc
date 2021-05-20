import FungibleToken from 0xFungibleToken
import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT from 0xMintasticNFT
import MintasticMarket from 0xMintasticMarket
import MintasticCredit from 0xMintasticCredit
import FiatPaymentProvider from 0xFiatPaymentProvider

/*
 * This transaction is used to setup a payment router proxy
 * The transaction is invoked by mintastic.
 */
transaction(currency: String) {

    let admin1:&FiatPaymentProvider.Administrator
    let admin2:&PaymentProviderProxy.Administrator

    prepare(mintastic: AuthAccount) {
        let ex1 = "cannot borrow fiat payment provider admin"
        let ex2 = "cannot borrow payment provider proxy admin"
        let ex3 = "cannot borrow market admin"

        self.admin1 = mintastic.borrow<&FiatPaymentProvider.Administrator>(from: FiatPaymentProvider.FiatPaymentProviderAdminStoragePath) ?? panic(ex1)
        self.admin2 = mintastic.borrow<&PaymentProviderProxy.Administrator>(from: PaymentProviderProxy.PaymentProviderProxyAdminStoragePath) ?? panic(ex2)
        self.admin3 = mintastic.borrow<&MintasticMarket.MarketAdmin>(from: MintasticMarket.MintasticMarketAdminStoragePath) ?? panic(ex3)
    }

    execute {
        let delegate = self.admin1.createRouter(currency: currency)
        let proxy    = self.admin2.createRouter(delegate: delegate)

        self.admin3.setPaymentRouter(currency: "eur", paymentRouter: <- proxy)
    }
}
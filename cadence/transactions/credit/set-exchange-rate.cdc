import FungibleToken from 0xFungibleToken
import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT from 0xMintasticNFT
import MintasticMarket from 0xMintasticMarket
import MintasticCredit from 0xMintasticCredit

/*
 * This transaction is used to change the exchange rate of an PaymentExchange instance.
 * The transaction is invoked by mintastic.
 */
transaction(currency: String, exchangeRate: UFix64, blockDelay: UInt8) {

    let admin:&MintasticCredit.Administrator

    prepare(mintastic: AuthAccount) {
        let ex = "cannot borrow mintastic credit administrator"
        self.admin = mintastic.borrow<&MintasticCredit.Administrator>(from: MintasticCredit.MintasticCreditAdminStoragePath) ?? panic(ex)
    }

    execute {
        self.admin.setExchangeRate(currency: currency, exchangeRate: exchangeRate, blockDelay: blockDelay)
    }
}
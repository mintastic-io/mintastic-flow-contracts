import FungibleToken from 0xFungibleToken
import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT from 0xMintasticNFT
import MintasticMarket from 0xMintasticMarket
import MintasticCredit from 0xMintasticCredit

/*
 * This transaction is used to invoke the getExchangeRate function of an PaymentExchange instance in order
 * to update the exchange rate via the lazy block height based exchange rate update mechanism.
 * The transaction is invoked by mintastic.
 */
transaction(currency: String) {

    let admin:&MintasticCredit.Administrator

    prepare(mintastic: AuthAccount) {
        let ex = "cannot borrow mintastic credit administrator"
        self.admin = mintastic.borrow<&MintasticCredit.Administrator>(from: MintasticCredit.MintasticCreditAdminStoragePath) ?? panic(ex)
    }

    execute {
        self.admin.getPaymentExchange(currency: currency).getExchangeRate()
    }
}
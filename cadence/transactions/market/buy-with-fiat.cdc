import FungibleToken from 0xFungibleToken
import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT from 0xMintasticNFT
import MintasticMarket from 0xMintasticMarket
import MintasticCredit from 0xMintasticCredit

/*
 * This transaction purchases a NFT by creating mintastic credits on the fly after a fiat payment.
 * Due to the off-chain characteristics of this payment method, the mintastic contract owner issues this transaction.
 */
transaction(owner: Address, buyer: Address, assetId: String, price: UFix64, amount: UInt16) {

    let nftProvider: &{MintasticMarket.PublicMarketStore}
    let nftReceiver: &{NonFungibleToken.Receiver}
    let creditAdmin: &MintasticCredit.Administrator

    prepare(mintastic: AuthAccount) {
        let ex1 = "could not borrow mintastic sale offer collection reference"
        let ex2 = "could not borrow mintastic collection reference"
        let ex3 = "could not borrow mintastic credit admin"

        self.nftProvider = getAccount(owner).getCapability<&{MintasticMarket.PublicMarketStore}>(/public/MintasticMarketStore).borrow() ?? panic(ex1)
        self.nftReceiver = getAccount(buyer).getCapability<&{NonFungibleToken.Receiver}>(/public/MintasticNFTs).borrow() ?? panic(ex2)
        self.creditAdmin = mintastic.borrow<&MintasticCredit.Administrator>(from: /storage/MintasticCreditAdmin) ?? panic(ex3)
    }

    execute {
        let vault <- self.creditAdmin.createCredits(amount: price * UFix64(amount))

        let payment <- MintasticCredit.exchange(vault: <- vault, currency: "eur")
        self.nftProvider.buy(assetId: assetId, amount: amount, payment: <- payment, receiver: self.nftReceiver)
    }
}
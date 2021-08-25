import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT from 0xMintasticNFT
import MintasticMarket from 0xMintasticMarket

/*
 * This transaction purchases a NFT by creating a mintastic market payment on the fly after a fiat payment.
 * Due to the off-chain characteristics of this payment method, the mintastic contract owner issues this transaction.
 */
transaction(owner: Address, buyer: Address, assetId: String, price: UFix64, amount: UInt16, bid: UInt64?) {

    let nftProvider: &{MintasticMarket.PublicMarketStore}
    let nftReceiver: &{NonFungibleToken.Receiver}
    let marketAdmin: &MintasticMarket.MarketAdmin

    prepare(mintastic: AuthAccount) {
        let ex1 = "could not borrow mintastic sale offer collection reference"
        let ex2 = "could not borrow mintastic collection reference"
        let ex3 = "could not borrow mintastic market admin reference"

        self.nftProvider = getAccount(owner).getCapability<&{MintasticMarket.PublicMarketStore}>(MintasticMarket.MintasticMarketStorePublicPath).borrow() ?? panic(ex1)
        self.nftReceiver = getAccount(buyer).getCapability<&{NonFungibleToken.Receiver}>(MintasticNFT.MintasticNFTPublicPath).borrow() ?? panic(ex2)
        self.marketAdmin = mintastic.borrow<&MintasticMarket.MarketAdmin>(from: MintasticMarket.MintasticMarketAdminStoragePath) ?? panic(ex3)
    }

    execute {
        let payment <- self.marketAdmin.createPayment(ref: "123", amount: UFix64(amount) * price, currency: "eur", exchangeRate: 1.0, bid: bid)
        self.nftProvider.buy(assetId: assetId, amount: amount, payment: <- payment, receiver: self.nftReceiver)
    }
}
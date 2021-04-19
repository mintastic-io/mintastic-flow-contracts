import FungibleToken from 0xFungibleToken
import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT from 0xMintasticNFT
import MintasticMarket from 0xMintasticMarket
import MintasticCredit from 0xMintasticCredit

/*
 * This transaction bids for a NFT by creating mintastic credits on the fly offering a fiat payment.
 * Due to the off-chain characteristics of this bid method, the mintastic contract owner issues this transaction.
 */
transaction(owner: Address, buyer: Address, assetId: String, price: UFix64, amount: UInt16) {

    let nftProvider: &{MintasticMarket.PublicMarketStore}
    let nftReceiver: Capability<&{NonFungibleToken.Receiver}>
    let creditAdmin: &MintasticCredit.Administrator
    let reversal:    Capability<&{FungibleToken.Receiver}>

    prepare(mintastic: AuthAccount) {
        let ex1 = "could not borrow mintastic nft provider reference"
        let ex2 = "could not borrow mintastic credit admin"

        self.nftProvider = getAccount(owner).getCapability<&{MintasticMarket.PublicMarketStore}>(/public/MintasticMarketStore).borrow() ?? panic(ex1)
        self.nftReceiver = getAccount(buyer).getCapability<&{NonFungibleToken.Receiver}>(/public/MintasticNFTs)
        self.creditAdmin = mintastic.borrow<&MintasticCredit.Administrator>(from: /storage/MintasticCreditAdmin) ?? panic(ex2)
        self.reversal    = mintastic.getCapability<&{FungibleToken.Receiver}>(/public/MintasticCredits)
    }

    execute {
        let vault <- self.creditAdmin.createCredits(amount: price * UFix64(amount))
        let bid <- MintasticCredit.createBid(vault: <- vault, reversal: self.reversal, receiver: self.nftReceiver, currency: "eur", amount: amount)
        self.nftProvider.bid(assetId: assetId, amount: amount, bidding: <- bid)
    }
}
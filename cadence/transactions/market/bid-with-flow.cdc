import FungibleToken from 0xFungibleToken
import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT from 0xMintasticNFT
import MintasticMarket from 0xMintasticMarket
import MintasticCredit from 0xMintasticCredit

/*
 * This transaction bids for a NFT by locking flow tokens in a bid instance.
 * Due to the flow token vault interaction of this payment method, the vault owner issues this transaction.
 */
transaction(owner: Address, assetId: String, price: UFix64, amount: UInt16) {

    let nftProvider: &{MintasticMarket.PublicMarketStore}
    let nftReceiver: Capability<&{NonFungibleToken.Receiver}>
    let tokenVault:  &FungibleToken.Vault
    let reversal:    Capability<&{FungibleToken.Receiver}>

    prepare(buyer: AuthAccount) {
        let ex1 = "could not borrow mintastic nft provider reference"
        let ex2 = "could not borrow mintastic credit admin"
        let ex3 = "could not borrow flow token vault"

        self.nftProvider = getAccount(owner).getCapability<&{MintasticMarket.PublicMarketStore}>(/public/MintasticMarketStore).borrow() ?? panic(ex1)
        self.nftReceiver = buyer.getCapability<&{NonFungibleToken.Receiver}>(/public/MintasticNFTs)
        self.tokenVault  = buyer.borrow<&FungibleToken.Vault>(from: /storage/flowTokenVault) ?? panic(ex3)
        self.reversal    = buyer.getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
    }

    execute {
        let exchangeRate = MintasticCredit.getExchangeRate(currency: "flow")

        let vault <- self.tokenVault.withdraw(amount: (price * UFix64(amount)) / exchangeRate)
        let bid <- MintasticCredit.createBid(vault: <- vault, reversal: self.reversal, receiver: self.nftReceiver, currency: "flow", amount: amount)
        self.nftProvider.bid(assetId: assetId, amount: amount, bidding: <- bid)
    }
}
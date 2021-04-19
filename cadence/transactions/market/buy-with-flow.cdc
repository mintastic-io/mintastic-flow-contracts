import FungibleToken from 0xFungibleToken
import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT from 0xMintasticNFT
import MintasticMarket from 0xMintasticMarket
import MintasticCredit from 0xMintasticCredit

/*
 * This transaction purchases a NFT by exchanging flow tokens to mintastic credits on the fly.
 * Due to the flow token vault interaction of this payment method, the vault owner issues this transaction.
 */
transaction(owner: Address, assetId: String, price: UFix64, amount: UInt16) {

    let nftProvider: &{MintasticMarket.PublicMarketStore}
    let nftReceiver: &{NonFungibleToken.Receiver}
    let tokenVault:  &FungibleToken.Vault

    prepare(buyer: AuthAccount) {
        let ex1 = "could not borrow mintastic sale offer collection reference"
        let ex2 = "could not borrow mintastic collection reference"
        let ex3 = "could not borrow flow token vault"

        self.nftProvider = getAccount(owner).getCapability<&{MintasticMarket.PublicMarketStore}>(/public/MintasticMarketStore).borrow() ?? panic(ex1)
        self.nftReceiver = buyer.getCapability<&{NonFungibleToken.Receiver}>(/public/MintasticNFTs).borrow() ?? panic(ex2)
        self.tokenVault  = buyer.borrow<&FungibleToken.Vault>(from: /storage/flowTokenVault) ?? panic(ex3)
    }

    execute {
        let exchangeRate = MintasticCredit.getExchangeRate(currency: "flow")

        let vault <- self.tokenVault.withdraw(amount: (price * UFix64(amount)) / exchangeRate)
        let payment <- MintasticCredit.exchange(vault: <-vault, currency: "flow")

        self.nftProvider.buy(assetId: assetId, amount: amount, payment: <- payment, receiver: self.nftReceiver)
    }
}
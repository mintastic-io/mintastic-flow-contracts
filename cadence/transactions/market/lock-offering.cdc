import FungibleToken from 0xFungibleToken
import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT from 0xMintasticNFT
import MintasticMarket from 0xMintasticMarket
import MintasticCredit from 0xMintasticCredit

/*
 * This transaction is used to lock an nft offering of aa market item.
 * The transaction is invoked by the market item owner.
 */
transaction(owner: Address, assetId: String, amount: UInt16) {
    let marketToken: &MintasticMarket.MarketToken
    let marketStore: &{MintasticMarket.MarketStoreAdmin}

    prepare(mintastic: AuthAccount) {
        let ex2 = "cannot borrow mintastic market token reference"
        let storage2 = /storage/MintasticMarketToken

        let cap = getAccount(owner).getCapability<&{MintasticMarket.MarketStoreAdmin}>(/public/MintasticMarketStore)
        self.marketStore = cap.borrow() ?? panic("cannot borrow mintastic market store reference")

        self.marketToken = mintastic.borrow<&MintasticMarket.MarketToken>(from: storage2) ?? panic(ex2)
    }

    execute {
        self.marketStore.lockOffering(token: self.marketToken, assetId: assetId, amount: amount)
    }
}
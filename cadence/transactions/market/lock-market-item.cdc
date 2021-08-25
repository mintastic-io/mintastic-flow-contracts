import FungibleToken from 0xFungibleToken
import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT from 0xMintasticNFT
import MintasticMarket from 0xMintasticMarket

/*
 * This transaction is used to lock a nft market item.
 * The transaction is invoked by mintastic.
 */
transaction(owner: Address, assetId: String) {
    let marketToken: &MintasticMarket.MarketToken
    let marketStore: &{MintasticMarket.MarketStoreAdmin}

    prepare(mintastic: AuthAccount) {
        let ex2 = "cannot borrow mintastic market token reference"
        let storage2 = MintasticMarket.MintasticMarketTokenStoragePath

        let cap = getAccount(owner).getCapability<&{MintasticMarket.MarketStoreAdmin}>(MintasticMarket.MintasticMarketStorePublicPath)
        self.marketStore = cap.borrow() ?? panic("cannot borrow mintastic market store reference")

        self.marketToken = mintastic.borrow<&MintasticMarket.MarketToken>(from: storage2) ?? panic(ex2)
    }

    execute {
        self.marketStore.lock(token: self.marketToken, assetId: assetId)
    }
}
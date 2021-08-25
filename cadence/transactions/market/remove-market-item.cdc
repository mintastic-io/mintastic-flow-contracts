import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT     from 0xMintasticNFT
import MintasticMarket  from 0xMintasticMarket

/*
 * This transaction removes a market item from a market store.
 * The transaction is invoked by the market item owner.
 */
transaction(assetId: String) {

    let store:  &MintasticMarket.MarketStore

    prepare(owner: AuthAccount) {
        let storage = MintasticMarket.MintasticMarketStoreStoragePath
        let ex = "could not borrow mintastic sale offers"

        self.store = owner.borrow<&MintasticMarket.MarketStore>(from: storage) ?? panic(ex)
    }

    execute {
        let item <- self.store.remove(assetId: assetId)
        destroy item
    }
}
import FungibleToken from 0xFungibleToken
import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT from 0xMintasticNFT
import MintasticMarket from 0xMintasticMarket

/*
 * This transaction is used to reject a market item bid.
 */
transaction(owner: Address, assetId: String, bidId: UInt64) {

    let marketStore: &{MintasticMarket.PublicMarketStore}
    let marketItem:  &{MintasticMarket.PublicMarketItem}

    prepare(mintastic: AuthAccount) {
        let ex1 = "could not borrow mintastic sale offer collection reference"
        let ex2 = "could not borrow mintastic market item"

        self.marketStore = getAccount(owner).getCapability<&{MintasticMarket.PublicMarketStore}>(MintasticMarket.MintasticMarketStorePublicPath).borrow() ?? panic(ex1)
        self.marketItem = self.marketStore.borrowMarketItem(assetId: assetId) ?? panic(ex2)
    }

    execute {
        self.marketItem.rejectBid(id: bidId)
    }
}
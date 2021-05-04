import FungibleToken from 0xFungibleToken
import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT from 0xMintasticNFT
import MintasticMarket from 0xMintasticMarket
import MintasticCredit from 0xMintasticCredit

/*
 * This transaction is used to change the price of a market item.
 * The transaction is invoked by the market item owner.
 */
transaction(owner: Address, assetId: String, price: UFix64) {
    let marketStore: &MintasticMarket.MarketStore

    prepare(owner: AuthAccount) {
        let ex = "cannot borrow mintastic market store reference"
        self.marketStore = owner.borrow<&MintasticMarket.MarketStore>(from: /storage/MintasticMarketStore) ?? panic(ex)
    }

    execute {
        let marketItem = &self.marketStore.items[assetId] as! &MintasticMarket.MarketItem
        marketItem.setPrice(price: price)
    }
}
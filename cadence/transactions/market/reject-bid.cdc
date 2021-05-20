import FungibleToken from 0xFungibleToken
import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT from 0xMintasticNFT
import MintasticMarket from 0xMintasticMarket
import MintasticCredit from 0xMintasticCredit

/*
 * This transaction is used to reject a bid on a market item.
 * The transaction is invoked by the market item owner.
 */
transaction(owner: Address, assetId: String, bidId: UInt64) {
    let marketStore: &MintasticMarket.MarketStore

    prepare(owner: AuthAccount) {
        let ex = "cannot borrow mintastic market store reference"
        self.marketStore = owner.borrow<&MintasticMarket.MarketStore>(from: MintasticMarket.MintasticMarketStoreStoragePath) ?? panic(ex)
    }

    execute {
        self.marketStore.rejectBid(assetId: assetId, bidId: bidId, force: true)
    }
}
import FungibleToken from 0xFungibleToken
import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT from 0xMintasticNFT
import MintasticMarket from 0xMintasticMarket
import MintasticCredit from 0xMintasticCredit

/*
 * This transaction is used to abort a bid on a market item.
 * The transaction is invoked by mintastic.
 */
transaction(owner: Address, assetId: String, bidId: UInt64) {
    let marketStore: &{MintasticMarket.PublicMarketStore}

    prepare(mintastic: AuthAccount) {
        let cap = getAccount(owner).getCapability<&{MintasticMarket.PublicMarketStore}>(/public/MintasticMarketStore)
        self.marketStore = cap.borrow() ?? panic("cannot borrow mintastic market store reference")
    }

    execute {
        self.marketStore.abortBid(assetId: assetId, bidId: bidId)
    }
}
import MintasticNFT     from 0xMintasticNFT
import MintasticMarket  from 0xMintasticMarket

/*
 * This transaction creates a lazy offering based market item.
 * A lazy offering uses a nft minter to mint tokens on the fly.
 * The transaction is invoked by mintastic.
 */
transaction(owner: Address, assetId: String, price: UFix64) {

    let minter: &MintasticNFT.NFTMinter
    let market: &MintasticMarket.MarketStore

    prepare(mintastic: AuthAccount) {
        let Storage1 = MintasticNFT.NFTMinterStoragePath
        let Storage2 = MintasticMarket.MintasticMarketStoreStoragePath

        let ex1 = "could not borrow nft minter"
        let ex2 = "could not borrow nft market"

        self.minter = mintastic.borrow<&MintasticNFT.NFTMinter>(from: Storage1) ?? panic(ex1)
        self.market = mintastic.borrow<&MintasticMarket.MarketStore>(from: Storage2) ?? panic(ex2)
    }

    execute {
        let offering   <- MintasticMarket.createLazyOffer(assetId: assetId, minter: self.minter)
        let marketItem <- MintasticMarket.createMarketItem(assetId: assetId, price: price, nftOffering: <- offering, recipients: {owner:1.0})
        self.market.insert(item: <- marketItem)
    }
}
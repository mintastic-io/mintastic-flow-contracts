import MintasticNFT     from 0xMintasticNFT
import MintasticMarket  from 0xMintasticMarket

/*
 * This transaction creates a lazy offering based market item.
 * A lazy offering uses a nft minter to mint tokens on the fly.
 * The transaction is invoked by mintastic.
 */
transaction(assetId: String, price: UFix64, shares: {String:UFix64}) {

    let minter: &MintasticNFT.MinterFactory
    let market: &MintasticMarket.MarketStore

    prepare(mintastic: AuthAccount) {
        let Storage1 = MintasticNFT.MinterFactoryStoragePath
        let Storage2 = MintasticMarket.MintasticMarketStoreStoragePath

        let ex1 = "could not borrow nft minter"
        let ex2 = "could not borrow nft market"

        self.minter = mintastic.borrow<&MintasticNFT.MinterFactory>(from: Storage1) ?? panic(ex1)
        self.market = mintastic.borrow<&MintasticMarket.MarketStore>(from: Storage2) ?? panic(ex2)
    }

    execute {
        let supply = MintasticNFT.assets[assetId]!.supply.max
        let offering   <- MintasticMarket.createLazyOffer(assetId: assetId, minter: <- self.minter.createMinter(allowedAmount: supply))
        let marketItem <- MintasticMarket.createMarketItem(assetId: assetId, price: price, nftOffering: <- offering, shares: shares)
        self.market.insert(item: <- marketItem)
    }
}
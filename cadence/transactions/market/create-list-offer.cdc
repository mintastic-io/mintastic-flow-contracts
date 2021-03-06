import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT     from 0xMintasticNFT
import MintasticMarket  from 0xMintasticMarket

/*
 * This transaction creates a list offering based market item.
 * A list offering uses a list of token ids which are already minted.
 * The transaction is invoked by the market item owner.
 */
transaction(assetId: String, price: UFix64, shares: {String:UFix64}) {

    let nftProvider: Capability<&{NonFungibleToken.Provider, MintasticNFT.CollectionPublic}>
    let saleOffers:  &MintasticMarket.MarketStore

    prepare(owner: AuthAccount) {
        let ex = "could not borrow mintastic sale offers"

        self.nftProvider = owner.getCapability<&{NonFungibleToken.Provider, MintasticNFT.CollectionPublic}>(MintasticNFT.MintasticNFTPrivatePath)
        self.saleOffers  = owner.borrow<&MintasticMarket.MarketStore>(from: MintasticMarket.MintasticMarketStoreStoragePath) ?? panic(ex)
    }

    execute {
        let tokenIds    = self.nftProvider.borrow()!.getTokenIDs(assetId: assetId)
        let offering   <- MintasticMarket.createListOffer(tokenIds: tokenIds, assetId: assetId, provider: self.nftProvider)
        let marketItem <- MintasticMarket.createMarketItem(assetId: assetId, price: price, nftOffering: <- offering, shares: shares)
        self.saleOffers.insert(item: <- marketItem)
    }
}
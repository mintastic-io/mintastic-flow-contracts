import FungibleToken from 0xFungibleToken
import MintasticMarket from 0xMintasticMarket

/*
 * This transaction setup a creator account so that an account address is able
 * to sell mintastic NFTs.
 */
transaction {
    prepare(signer: AuthAccount) {
        let Public  = /public/MintasticMarketStore
        let Storage = /storage/MintasticMarketStore

        if signer.borrow<&MintasticMarket.MarketStore>(from: Storage) == nil {
            let collection <- MintasticMarket.createMarketStore()
            signer.save(<-collection, to: Storage)
            signer.link<&{MintasticMarket.PublicMarketStore, MintasticMarket.MarketStoreAdmin}>(Public, target: Storage)
        }
    }
}

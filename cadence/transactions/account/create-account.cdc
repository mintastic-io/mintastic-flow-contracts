import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT from 0xMintasticNFT
import FungibleToken from 0xFungibleToken
import MintasticMarket from 0xMintasticMarket

transaction(pubKey: String) {
    prepare(acct: AuthAccount) {
        let account = AuthAccount(payer: acct)
        account.addPublicKey(pubKey.decodeHex())

        // setup collector
        // ***************
        let Public  = MintasticNFT.MintasticNFTPublicPath
        let Private = MintasticNFT.MintasticNFTPrivatePath
        let Storage = MintasticNFT.MintasticNFTStoragePath

        let collection <- MintasticNFT.createEmptyCollection()
        account.save(<-collection, to: MintasticNFT.MintasticNFTStoragePath)

        account.link<&{NonFungibleToken.Receiver, MintasticNFT.CollectionPublic}>(Public, target: Storage)
        account.link<&{NonFungibleToken.Provider, MintasticNFT.CollectionPublic}>(Private, target: Storage)

        // setup market store
        // ******************
        let Public2  = MintasticMarket.MintasticMarketStorePublicPath
        let Storage2 = MintasticMarket.MintasticMarketStoreStoragePath

        let store <- MintasticMarket.createMarketStore()
        account.save(<-store, to: Storage2)
        account.link<&{MintasticMarket.PublicMarketStore, MintasticMarket.MarketStoreAdmin}>(Public2, target: Storage2)
    }
}
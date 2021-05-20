import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT from 0xMintasticNFT

/*
 * This transaction setup a creator account so that an account address is able
 * to collect mintastic NFTs.
 */
transaction {

    let capability1: Capability<&{NonFungibleToken.Receiver}>
    let capability2: Capability<&{NonFungibleToken.Provider}>

    prepare(signer: AuthAccount) {
        let Public  = MintasticNFT.MintasticNFTPublicPath
        let Private = MintasticNFT.MintasticNFTPrivatePath
        let Storage = MintasticNFT.MintasticNFTStoragePath

        if signer.borrow<&MintasticNFT.Collection>(from: MintasticNFT.MintasticNFTStoragePath) == nil {
            let collection <- MintasticNFT.createEmptyCollection()
            signer.save(<-collection, to: MintasticNFT.MintasticNFTStoragePath)

            signer.link<&{NonFungibleToken.Receiver, MintasticNFT.CollectionPublic}>(Public, target: Storage)
            signer.link<&{NonFungibleToken.Provider, MintasticNFT.CollectionPublic}>(Private, target: Storage)
        }

        self.capability1 = signer.getCapability<&{NonFungibleToken.Receiver}>(Public)
        self.capability2 = signer.getCapability<&{NonFungibleToken.Provider}>(Private)
    }

    execute {
        if !self.capability1.check() {
            panic("no public capability found")
        }
        if !self.capability2.check() {
            panic("no private capability found")
        }
    }
}

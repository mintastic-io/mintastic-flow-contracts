import MintasticNFT from 0xMintasticNFT
import NonFungibleToken from 0xNonFungibleToken

/*
 * This transaction is used to mint new tokens of a registered asset.
 */
transaction(recipient: Address, assetId: String, amount: UInt16) {
    let factory: &MintasticNFT.MinterFactory
    let receiver:  &{MintasticNFT.CollectionPublic}

    prepare(mintastic: AuthAccount) {
        let ex1 = "could not borrow minter factory reference"
        let ex2 = "could not get receiver reference to the NFT Collection"

        let Public  = MintasticNFT.MintasticNFTPublicPath
        let Storage = MintasticNFT.MinterFactoryStoragePath

        self.factory  = mintastic.borrow<&MintasticNFT.MinterFactory>(from: Storage) ?? panic(ex1)
        self.receiver = getAccount(recipient).getCapability(Public).borrow<&{MintasticNFT.CollectionPublic}>() ?? panic(ex2)
    }

    execute {
        let minter <- self.factory.createMinter(allowedAmount: amount)
        let tokens <- minter.mint(assetId: assetId, amount: amount)
        self.receiver.batchDeposit(tokens: <- tokens)
        destroy minter
    }
}

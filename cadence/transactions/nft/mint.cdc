import MintasticNFT from 0xMintasticNFT
import NonFungibleToken from 0xNonFungibleToken

/*
 * This transaction is used to mint new tokens of an registered asset.
 */
transaction(recipient: Address, assetId: String, amount: UInt16) {
    let minterRef: &MintasticNFT.NFTMinter
    let receiver:  &{MintasticNFT.CollectionPublic}

    prepare(mintastic: AuthAccount) {
        let ex1 = "could not borrow nft minter reference"
        let ex2 = "Could not get receiver reference to the NFT Collection"

        let Public  = MintasticNFT.MintasticNFTPublicPath
        let Storage = MintasticNFT.NFTMinterStoragePath

        self.minterRef = mintastic.borrow<&MintasticNFT.NFTMinter>(from: Storage) ?? panic(ex1)
        self.receiver  = getAccount(recipient).getCapability(Public).borrow<&{MintasticNFT.CollectionPublic}>() ?? panic(ex2)
    }

    execute {
        let tokens <- self.minterRef.mint(assetId: assetId, amount: amount)
        self.receiver.batchDeposit(tokens: <- tokens)
    }
}

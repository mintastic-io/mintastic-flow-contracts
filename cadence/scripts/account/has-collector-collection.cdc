import MintasticNFT from 0xMintasticNFT
import NonFungibleToken from 0xNonFungibleToken

pub fun main(address: Address): Bool {
    let collectionRef = getAccount(address)
        .getCapability(MintasticNFT.MintasticNFTPublicPath)
        .borrow<&{MintasticNFT.CollectionPublic}>()
        ?? panic("Could not borrow capability from public collection")

    getAccount(address)
        .getCapability(MintasticNFT.MintasticNFTPublicPath)
        .borrow<&{MintasticNFT.CollectionPublic}>()
        ?? panic("Could not borrow capability from public collection")

    return true
}
import MintasticNFT from 0xMintasticNFT
import NonFungibleToken from 0xNonFungibleToken

pub fun main(address: Address): Bool {
    let cap = getAccount(address).getCapability(MintasticNFT.MintasticNFTPublicPath)
    return cap.borrow<&{MintasticNFT.CollectionPublic}>() != nil
}
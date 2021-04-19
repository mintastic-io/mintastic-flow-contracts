import MintasticNFT from 0xMintasticNFT
import NonFungibleToken from 0xNonFungibleToken

// This transaction returns an array of all the asset ids in the collector collection

pub fun main(account: Address): [String] {
    let collectionRef = getAccount(account)
        .getCapability(/public/MintasticNFTs)
        .borrow<&{MintasticNFT.CollectionPublic}>()
        ?? panic("Could not borrow capability from public collection")

    return collectionRef.getAssetIDs()
}
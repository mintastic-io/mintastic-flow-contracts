import MintasticNFT from 0xMintasticNFT

/*
 * This script is used to read al token ids of an mintastic nft collection.
 */
pub fun main(address: Address): [UInt64] {
    let collectionCap = getAccount(address).getCapability(/public/MintasticNFTs)
    let collectionRef = collectionCap.borrow<&{MintasticNFT.CollectionPublic}>() ?? panic("Could not borrow collection")

    return collectionRef.getIDs()
}
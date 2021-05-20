import MintasticNFT from 0xMintasticNFT

pub fun main(assetIds: [String]): {String: {UInt16:UInt64}} {
    let collectionRef = getAccount(account)
        .getCapability(MintasticNFT.MintasticNFTPublicPath)
        .borrow<&{MintasticNFT.CollectionPublic}>()
        ?? panic("Could not borrow capability from public collection")

    let assets:{String: {UInt16:UInt64}} = {}
    let assetIds = collectionRef.getAssetIDs()

    for id in assetIds {
        assets[id] = collectionRef.getEditions(assetId: id)
    }

    return assets
}
import MintasticNFT from 0xMintasticNFT

pub fun main(assetId: String): {String: UInt16} {
    let asset = MintasticNFT.assets[assetId] ?? panic("asset  not found")
    let maxSupply = asset.supply.max
    let curSupply = asset.supply.cur

    let supplies: {String: UInt16} = {}
    supplies["maxSupply"] = maxSupply
    supplies["curSupply"] = curSupply

    return supplies
}
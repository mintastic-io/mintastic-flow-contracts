import MintasticNFT from 0xMintasticNFT

pub fun main(assetId: String, amount: UInt16): Bool {
    let asset = MintasticNFT.assets[assetId] ?? panic("asset not found")
    return amount <= (asset.supply.max - asset.supply.cur)
}
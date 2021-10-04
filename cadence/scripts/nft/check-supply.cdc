import MintasticNFT from 0xMintasticNFT

pub fun main(assetId: String, amount: UInt16): Bool {
    let asset = MintasticNFT.getAsset(assetId: assetId)
    return amount <= (asset.supply.max - asset.supply.cur)
}
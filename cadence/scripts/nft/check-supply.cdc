import MintasticNFT from 0xMintasticNFT

pub fun main(assetId: String, amount: UInt16): Bool {
    let maxSupply = MintasticNFT.maxSupplies[assetId] ?? panic("asset not found")
    let curSupply = MintasticNFT.curSupplies[assetId] ?? panic("asset not found")

    return amount <= (maxSupply - curSupply)
}
import MintasticNFT from 0xMintasticNFT

pub fun main(creatorId: String): Int {
    return (MintasticNFT.getLockedSeries(creatorId: creatorId) ?? []).length + 1
}
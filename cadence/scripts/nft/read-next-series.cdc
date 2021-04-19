import MintasticNFT from 0xMintasticNFT

pub fun main(creatorId: String): Int {
    return (MintasticNFT.lockedSeries[creatorId] ?? []).length + 1
}
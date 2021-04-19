import MintasticNFT from 0xMintasticNFT

/*
 * This transaction is used to lock a series so that no more assets of the same series
 * can be created.
 */
transaction(creatorId: String, series: UInt16) {
    let assetRegistry: &MintasticNFT.AssetRegistry

    prepare(mintastic: AuthAccount) {
        let ex = "could not borrow asset registry reference"
        self.assetRegistry = mintastic.borrow<&MintasticNFT.AssetRegistry>(from: /storage/AssetRegistry) ?? panic(ex)
    }

    execute {
        self.assetRegistry.lockSeries(creatorId: creatorId, series: series)
    }
}

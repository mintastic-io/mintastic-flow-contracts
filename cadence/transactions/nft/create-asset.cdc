import MintasticNFT from 0xMintasticNFT

/*
 * This transaction is used to create an asset in order to mint tokens.
 * After the creation the asset is ready to be minted or to be purchased in a lazy manner.
 */
transaction(creators: {String:UFix64}, assetId: String, content: String, royalty: UFix64, series: UInt16, type: UInt16, maxSupply: UInt16) {
    let assetRegistry: &MintasticNFT.AssetRegistry

    prepare(mintastic: AuthAccount) {
        let ex = "could not borrow asset registry reference"
        self.assetRegistry = mintastic.borrow<&MintasticNFT.AssetRegistry>(from: MintasticNFT.AssetRegistryStoragePath) ?? panic(ex)
    }

    execute {
        let asset = MintasticNFT.Asset(creators: creators, assetId: assetId, content: content, royalty: royalty, series: series, type: type, maxSupply: maxSupply)
        self.assetRegistry.store(asset: asset)
    }
}

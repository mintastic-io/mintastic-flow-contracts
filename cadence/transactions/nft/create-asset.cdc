import MintasticNFT from 0xMintasticNFT

/*
 * This transaction is used to create an asset in order to mint tokens.
 * After the creation the asset is ready to be minted or to be purchased in a lazy manner.
 */
transaction(creatorId: String, assetId: String, content: String, addresses: {Address:UFix64}, royalty: UFix64, series: UInt16, type: UInt16, maxSupply: UInt16) {
    let assetRegistry: &MintasticNFT.AssetRegistry

    prepare(mintastic: AuthAccount) {
        let ex = "could not borrow asset registry reference"
        self.assetRegistry = mintastic.borrow<&MintasticNFT.AssetRegistry>(from: /storage/AssetRegistry) ?? panic(ex)
    }

    execute {
        let asset = MintasticNFT.Asset(creatorId: creatorId, assetId: assetId, content: content, addresses: addresses, royalty: royalty, series: series, type: type)
        self.assetRegistry.store(asset: asset, maxSupply: maxSupply)
    }
}

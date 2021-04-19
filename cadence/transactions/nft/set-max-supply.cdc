import MintasticNFT from 0xMintasticNFT

/*
 * This transaction sets the max supply of an already registered asset.
 */
transaction(assetId: String, supply: UInt16) {
    let assetRegistry: &MintasticNFT.AssetRegistry

    prepare(mintastic: AuthAccount) {
        let ex = "could not borrow asset registry reference"
        self.assetRegistry = mintastic.borrow<&MintasticNFT.AssetRegistry>(from: /storage/AssetRegistry) ?? panic(ex)
    }

    execute {
        self.assetRegistry.setMaxSupply(assetId: assetId, supply: supply)
    }
}

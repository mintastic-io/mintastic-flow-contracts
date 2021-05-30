import MintasticNFT from 0xMintasticNFT

/*
 * This transaction is used to register a creator with its corresponding address.
 */
transaction(creatorId: String, address: Address) {
    let creatorRegistry: &MintasticNFT.CreatorRegistry

    prepare(mintastic: AuthAccount) {
        let storage = MintasticNFT.CreatorRegistryStoragePath
        let ex = "could not borrow creator registry reference"
        self.creatorRegistry = mintastic.borrow<&MintasticNFT.CreatorRegistry>(from: storage) ?? panic(ex)
    }

    execute {
        self.creatorRegistry.store(creatorId: creatorId, address: address)
    }
}

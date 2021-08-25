import MintasticNFT from 0xMintasticNFT
import NonFungibleToken from 0xNonFungibleToken

/*
 * This transaction is used to transfer a NFT from the mintastic collection to an other address.
 */
transaction(buyer: Address, assetId: String, amount: UInt16) {

    let nftProvider: &MintasticNFT.Collection
    let nftReceiver: &{NonFungibleToken.Receiver}

    prepare(owner: AuthAccount) {
        let ex1 = "could not borrow mintastic nft provider"
        let ex2 = "could not borrow mintastic nft receiver"

        let path = MintasticNFT.MintasticNFTPublicPath

        self.nftProvider = owner.borrow<&MintasticNFT.Collection>(from: /storage/MintasticNFTs) ?? panic(ex1)
        self.nftReceiver = getAccount(buyer).getCapability<&{NonFungibleToken.Receiver}>(path).borrow() ?? panic(ex2)
    }

    execute {
        let tokenIds = self.nftProvider.getTokenIDs(assetId: assetId)

        if (tokenIds.length == 0) {
            panic("no tokens found")
        }

        var a:UInt16 = 0
        while a < amount {
            a = a + (1 as UInt16)
            let tokenId = tokenIds.removeFirst()
            let token <- self.nftProvider.withdraw(withdrawID: tokenId) as! @MintasticNFT.NFT
            assert(token.data.assetId == assetId, message: "asset id mismatch")
            self.nftReceiver.deposit(token: <- token)
        }
    }
}
import MintasticNFT from 0xMintasticNFT
import NonFungibleToken from 0xNonFungibleToken

/*
 * This transaction is used to transfer a NFT from the mintastic collection to an other address.
 */
transaction(buyer: Address, assetId: String, amount: UInt16) {

    let nftProvider : &MintasticNFT.Collection
    let nftReceiver: Capability<&{NonFungibleToken.Receiver}>

    prepare(mintastic: AuthAccount) {
        let ex1 = "could not borrow mintastic nft provider"
        let ex2 = "could not borrow mintastic nft receiver"

        self.nftProvider = mintastic.borrow<&MintasticNFT.Collection>(from:MintasticNFT.MintasticNFTStoragePath) ?? panic(ex1)
        self.nftReceiver = getAccount(buyer).getCapability<&{NonFungibleToken.Receiver}>(MintasticNFT.MintasticNFTPublicPath)
    }

    execute {
        let tokenIds = self.nftProvider.getTokenIDs(assetId: assetId)

        var a:UInt16 = 0
        while a < amount {
            a = a + (1 as UInt16)
            let tokenId = tokenIds.removeFirst()
            assert(!MintasticNFT.lockedTokens.contains(tokenId), message: "token is locked")
            let token <- self.nftProvider.withdraw(withdrawID: tokenId) as! @MintasticNFT.NFT
            assert(token.data.assetId == assetId, message: "asset id mismatch")
            self.nftReceiver.borrow()!.deposit(token: <- token)
        }
    }
}
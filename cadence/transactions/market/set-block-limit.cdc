import FungibleToken from 0xFungibleToken
import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT from 0xMintasticNFT
import MintasticMarket from 0xMintasticMarket
import MintasticCredit from 0xMintasticCredit

/*
 * This transaction is used to set the block limit of the block registry.
 */
transaction(blockLimit: UInt64) {

    let admin: &MintasticMarket.MarketAdmin

    prepare(mintastic: AuthAccount) {
        let ex = "could not borrow mintastic market admin reference"
        self.admin = mintastic.borrow<&MintasticMarket.MarketAdmin>(from: MintasticMarket.MintasticMarketAdminStoragePath) ?? panic(ex)
    }

    execute {
        self.admin.setBlockLimit(blockLimit: blockLimit)
    }
}
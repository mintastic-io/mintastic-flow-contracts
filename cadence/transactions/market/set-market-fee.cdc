import FungibleToken from 0xFungibleToken
import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT from 0xMintasticNFT
import MintasticMarket from 0xMintasticMarket
import MintasticCredit from 0xMintasticCredit

/*
 * This transaction is used to set the market fee for service shares.
 */
transaction(key: UFix64, value: UFix64) {

    let admin: &MintasticMarket.MarketAdmin

    prepare(mintastic: AuthAccount) {
        let ex = "could not borrow mintastic market admin reference"
        self.admin = mintastic.borrow<&MintasticMarket.MarketAdmin>(from: /storage/MintasticMarketAdmin) ?? panic(ex)
    }

    execute {
        self.admin.setMarketFee(key: key, value: value)
    }
}
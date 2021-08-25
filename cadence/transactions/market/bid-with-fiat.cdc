import MintasticMarket from 0xMintasticMarket

/*
 * This transaction creates a bid for a NFT by invoking the bid function on a mintastic market item.
 * Due to the off-chain characteristics of this payment method, the mintastic contract owner issues this transaction.
 */
transaction(owner: Address, assetId: String, price: UFix64, amount: UInt16) {

    let store: &{MintasticMarket.PublicMarketStore}

    prepare(mintastic: AuthAccount) {
        let path = MintasticMarket.MintasticMarketStorePublicPath
        let ex1  = "could not borrow mintastic sale offer collection reference"

        self.store = getAccount(owner).getCapability<&{MintasticMarket.PublicMarketStore}>(path).borrow() ?? panic(ex1)
    }

    execute {
        self.store.bid(ref: "123", assetId: assetId, amount: amount, price: price, currency: "eur", exchangeRate: 1.0)
    }
}
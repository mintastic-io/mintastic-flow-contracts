import MintasticMarket from 0xMintasticMarket

/*
 * This script is used to read the asset ids of a market store.
 */
pub fun main(address: Address): [String] {
    let ex1 = "cannot borrow mintastic market store reference"
    let ex2 = "no market item found"

    let storeCap = getAccount(address).getCapability(MintasticMarket.MintasticMarketStorePublicPath)
    let storeRef = storeCap.borrow<&{MintasticMarket.PublicMarketStore}>() ?? panic(ex1)

    return storeRef.getAssetIds()
}
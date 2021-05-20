import MintasticMarket from 0xMintasticMarket

/*
 * This script is used to read all bids of a market item offer related
 * to the given address and asset id.
 */
pub fun main(address: Address, assetId: String): [UInt64] {
    let ex1 = "cannot borrow mintastic market store reference"
    let ex2 = "no market item found"

    let storeCap = getAccount(address).getCapability(MintasticMarket.MintasticMarketStorePublicPath)
    let storeRef = storeCap.borrow<&{MintasticMarket.PublicMarketStore}>() ?? panic(ex1)

    let item = storeRef.borrowMarketItem(assetId: assetId) ?? panic(ex2)
    return item.bids.keys
}
import MintasticMarket from 0xMintasticMarket

/*
 * This script is used to read the supply of the market item with
 * to given address and asset id.
 */
pub fun main(address: Address, assetId: String): Int {
    let ex1 = "cannot borrow mintastic market store reference"
    let ex2 = "no market item found"

    let storeCap = getAccount(address).getCapability(MintasticMarket.MintasticMarketStorePublicPath)
    let storeRef = storeCap.borrow<&{MintasticMarket.PublicMarketStore}>() ?? panic(ex1)

    let item = storeRef.borrowMarketItem(assetId: assetId) ?? panic(ex2)
    // return item.getSupply()
    return 0
}
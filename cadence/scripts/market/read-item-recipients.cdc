import MintasticMarket from 0xMintasticMarket

/*
 * This script is used to read the recipients of a market item offer related
 * to the given address and asset id.
 */
pub fun main(address: Address, assetId: String): {Address:UFix64} {
    let storeCap = getAccount(address).getCapability(/public/MintasticMarketStore)
    let storeRef = storeCap.borrow<&{MintasticMarket.PublicMarketStore}>() ?? panic("cannot borrow market store")

    let item = storeRef.borrowMarketItem(assetId: assetId) ?? panic("no market item found")
    return item.getRecipients()
}
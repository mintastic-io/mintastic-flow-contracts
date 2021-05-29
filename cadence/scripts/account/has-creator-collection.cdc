import MintasticMarket from 0xMintasticMarket

pub fun main(address: Address): Bool {
    let cap = getAccount(address).getCapability(MintasticMarket.MintasticMarketStorePublicPath)
    return cap.borrow<&{MintasticMarket.PublicMarketStore}>() != nil
}
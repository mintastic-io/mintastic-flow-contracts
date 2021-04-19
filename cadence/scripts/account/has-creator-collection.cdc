import MintasticMarket from 0xMintasticMarket

pub fun main(address: Address): Bool {
    let collectionRef = getAccount(address)
        .getCapability(/public/MintasticSaleOffers)
        .borrow<&{MintasticMarket.PublicMarketStore}>()
        ?? panic("Could not borrow capability from public collection")

    getAccount(address)
        .getCapability(/public/MintasticSaleOffers)
        .borrow<&{MintasticMarket.PublicMarketStore}>()
        ?? panic("Could not borrow capability from public collection")

    return true
}
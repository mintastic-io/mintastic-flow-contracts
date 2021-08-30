import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT from 0xMintasticNFT
import FungibleToken from 0xFungibleToken

/*
 * This contract is used to realize all kind of market sell activities within mintastic.
 * The market supports direct payments as well as bids for custom assets. A MintasticCredit is used for
 * all market activities so a buyer have to exchange his source currency in order to buy something.
 *
 * A market item is a custom asset which is offered by the token holder for sale. These items can either be
 * already minted (list offering) or can be minted on the fly during the payment process handling (lazy offering).
 * Lazy offerings are especially useful to rule a time based drop or an edition based drop with a hard supply cut after the drop.
 *
 * Each payment is divided into different shares for the platform, creator (royalty) and the owner of the asset.
 */
pub contract MintasticMarket {
    pub event MarketItemLocked(assetId: String, amount: UInt16)
    pub event MarketItemUnlocked(assetId: String, amount: UInt16)
    pub event MarketItemInserted(assetId: String, owner: Address, price: UFix64)
    pub event MarketItemRemoved (assetId: String, owner: Address)
    pub event MarketItemSold(assetId: String, owner: Address, tokenIds: [UInt64], pid: UInt64, ref: String)
    pub event MarketItemSoldOut(assetId: String, owner: Address)
    pub event MarketItemBidAccepted(bidId: UInt64, assetId: String)
    pub event MarketItemPayout(pid: UInt64, ref: String, assetId: String, recipient: String, amount: UFix64, currency: String)

    pub let MintasticMarketStorePublicPath:  PublicPath
    pub let MintasticMarketAdminStoragePath: StoragePath
    pub let MintasticMarketStoreStoragePath: StoragePath
    pub let MintasticMarketTokenStoragePath: StoragePath

    access(self) var totalPayments: UInt64
    access(self) var totalBids:     UInt64
    access(self) let marketFees:    {UFix64: UFix64}

    /**
     * The resource interface definition for all payment implementations.
     * A payment resource is used to buy a mintastic asset, and it is created
     * by an PaymentExchange resource.
     */
    pub resource Payment {
        pub let pid: UInt64
        pub let ref: String
        pub let bid: UInt64?
        pub var amount: UFix64
        pub let currency: String
        pub let exchangeRate: UFix64

        init(ref: String, amount: UFix64, currency: String, exchangeRate: UFix64, bid: UInt64?) {
            MintasticMarket.totalPayments = MintasticMarket.totalPayments + (1 as UInt64)
            self.pid = MintasticMarket.totalPayments
            self.ref = ref
            self.bid = bid
            self.amount = amount
            self.currency = currency
            self.exchangeRate = exchangeRate
        }

        pub fun split(_ amount: UFix64): @Payment {
            pre { amount <= self.amount: "amount must be lower than or equal to payment amount" }
            self.amount = self.amount - amount

            return <- create Payment(ref: self.ref, amount: amount, currency: self.currency,
                                     exchangeRate: self.exchangeRate, bid: self.bid)
        }
    }

    /**
     * The resource interface definition for the bid mechanism.
     * A bid is used to initiate a buy process with a price amount below the offering.
     */
    pub resource Bid {
        pub let id: UInt64
        pub let ref: String
        pub let assetId: String
        pub let amount: UInt16
        pub var price: UFix64
        pub let currency: String
        pub let exchangeRate: UFix64

        init(ref: String, assetId: String, amount: UInt16, price: UFix64, currency: String, exchangeRate: UFix64) {
            MintasticMarket.totalBids = MintasticMarket.totalBids + (1 as UInt64)
            self.id = MintasticMarket.totalBids
            self.ref = ref
            self.assetId = assetId
            self.amount = amount
            self.price = price
            self.currency = currency
            self.exchangeRate = exchangeRate
        }
    }

    /**
     * Resource interface which can be used to read public information about a market item.
     */
    pub resource interface PublicMarketItem {
        pub let assetId:     String
        pub var price:       UFix64
        pub let bids:        @{UInt64: Bid}
        pub let shares:      {String: UFix64}
        pub fun getSupply(): Int
        pub fun getLocked(): UInt64
        pub fun getShares(): {String:UFix64}
        pub fun appendBid(bid: @Bid)
        pub fun acceptBid(id: UInt64)
        pub fun rejectBid(id: UInt64)
    }

    /**
     * Resource interface for all nft offerings on the mintastic market.
     */
    pub resource interface NFTOffering {
        pub fun provide(amount: UInt16): @NonFungibleToken.Collection
        pub fun getSupply(): Int
        pub fun lock(amount: UInt16)
        pub fun unlock(amount: UInt16)
    }

    /**
     * A ListOffering is a nft offering based on a list of already minted NFTs.
     * These NFTs were directly handled out of the owners NFT collection.
     */
    pub resource ListOffering: NFTOffering {
        pub let tokenIds:          [UInt64]
        pub let assetId:           String
        pub var locked:            UInt64
        access(self) let provider: Capability<&{NonFungibleToken.Provider}>

        pub fun provide(amount: UInt16): @NonFungibleToken.Collection {
            pre { self.getSupply() >= Int(amount): "supply/demand mismatch" }
            assert((self.getSupply() - Int(self.locked)) >= Int(amount), message: "supply/demand mismatch due to locked elements")
            let collection <- MintasticNFT.createEmptyCollection()
            var a:UInt16 = 0
            while a < amount {
                a = a + (1 as UInt16)
                let tokenId = self.tokenIds.removeFirst()
                let token <- self.provider.borrow()!.withdraw(withdrawID: tokenId) as! @MintasticNFT.NFT
                assert(token.data.assetId == self.assetId, message: "asset id mismatch")
                collection.deposit(token: <- token)
            }
            return <- collection
        }

        pub fun getSupply(): Int {
            return self.tokenIds.length
        }

        pub fun lock(amount: UInt16) {
            pre { self.tokenIds.length >= Int(amount): "not enough elements to lock" }
            self.locked = self.locked + UInt64(amount)
        }

        pub fun unlock(amount: UInt16) {
            pre { self.locked >= UInt64(amount): "not enough elements to unlock" }
            self.locked = self.locked - UInt64(amount)
        }

        init(tokenIds: [UInt64], assetId: String, provider: Capability<&{NonFungibleToken.Provider}>) {
            pre {
                provider.borrow() != nil: "Cannot borrow seller"
                tokenIds.length > 0: "token ids must not be empty"
            }
            self.tokenIds = tokenIds
            self.assetId  = assetId
            self.provider = provider
            self.locked   = 0
        }
    }

    /**
     * A LazyOffering is a nft offering based on a NFT minter resource which means that these NFTs
     * are going to be minted only after a successful sale.
     */
    pub resource LazyOffering: NFTOffering {
        pub let assetId: String
        pub var locked:  UInt64
        pub let minter:  @MintasticNFT.Minter

        pub fun provide(amount: UInt16): @NonFungibleToken.Collection {
            pre { self.getSupply() >= Int(amount): "supply/demand mismatch" }
            assert((self.getSupply() - Int(self.locked)) >= Int(amount), message: "supply/demand mismatch due to locked elements")
            return <- self.minter.mint(assetId: self.assetId, amount: amount)
        }

        pub fun getSupply(): Int {
            let supply = MintasticNFT.assets[self.assetId]!.supply
            return Int(supply.max - supply.cur)
        }

        pub fun lock(amount: UInt16) {
            pre { self.getSupply() >= Int(amount): "not enough elements to lock" }
            self.locked = self.locked + UInt64(amount)
        }

        pub fun unlock(amount: UInt16) {
            pre { self.locked >= UInt64(amount): "not enough elements to unlock" }
            self.locked = self.locked - UInt64(amount)
        }

        init(assetId: String, minter: @MintasticNFT.Minter) {
            self.assetId = assetId
            self.minter <- minter
            self.locked  = 0
        }

        destroy() {
            destroy self.minter
        }
    }

    /**
     * This resource represents a mintastic asset for sale and can be offered based on a list of already minted NFT tokens
     * or in a lazy manner where NFTs were only minted after a successful sale. A market item holds a collection of bids
     * which can be accepted or rejected by the NFT owner. The price of a market item can be changed, but by doing so
     * all bids will be rejected.
     */
    pub resource MarketItem: PublicMarketItem {
        pub let assetId: String
        pub var price:   UFix64
        pub var locked:  UInt64
        pub let bids:    @{UInt64: Bid}
        pub let shares:  {String:UFix64}

        access(self) let nftOffering: @{NFTOffering}

        // Returns a boolean value which indicates if the market item is sold out.
        pub fun sell(nftReceiver: &{NonFungibleToken.Receiver}, payment: @Payment, amount: UInt16): Bool {
            pre { self.nftOffering.getSupply() >= Int(amount): "supply/demand mismatch" }

            let pid = payment.pid
            let ref = payment.ref
            let balance = payment.amount

            self.emitServiceShare(payment: <- payment.split(balance * self.getServiceShare(amount: balance)))
            self.emitRoyaltyShare(payment: <- payment.split(balance * MintasticNFT.assets[self.assetId]!.royalty))
            self.emitDefaultShare(payment: <- payment)

            let tokens <- self.nftOffering.provide(amount: amount)
            let ids = tokens.getIDs()

            for key in ids {
                nftReceiver.deposit(token: <-tokens.withdraw(withdrawID: key))
            }
            if (self.owner?.address != nil) {
                let owner = self.owner?.address!
                emit MarketItemSold(assetId: self.assetId, owner: owner, tokenIds: ids, pid: pid, ref: ref)
            }
            destroy tokens

            return self.nftOffering.getSupply() == 0
        }

        access(self) fun emitDefaultShare(payment: @Payment) {
            let balance = payment.amount
            for recipient in self.shares.keys {
                let share <- payment.split(balance * self.shares[recipient]!)
                self.payout(payment: <- share, recipient: recipient)
            }
            assert(payment.amount == 0.0, message: "invalid recipient payments")
            destroy payment
        }

        access(self) fun emitRoyaltyShare(payment: @Payment) {
            let balance = payment.amount

            let creators = MintasticNFT.assets[self.assetId]!.creators
            for creatorId in creators.keys {
                let share <- payment.split(balance * creators[creatorId]!)
                self.payout(payment: <- share, recipient: creatorId)
            }
            assert(payment.amount == 0.0, message: "invalid royalty payments")
            destroy payment
        }

        access(self) fun emitServiceShare(payment: @Payment) {
            self.payout(payment: <- payment, recipient: "mintastic")
        }

        access(self) fun getServiceShare(amount: UFix64): UFix64 {
            for fee in MintasticMarket.marketFees.keys {
                if (amount <= fee) {
                    return MintasticMarket.marketFees[fee]!
                }
            }
            return 0.025
        }

        access(self) fun payout(payment: @Payment, recipient: String) {
            emit MarketItemPayout(pid: payment.pid, ref: payment.ref, assetId: self.assetId, recipient: recipient,
                                  amount: payment.amount, currency: payment.currency)
            destroy payment
        }

        pub fun getSupply(): Int {
            return self.nftOffering.getSupply()
        }

        pub fun lock(amount: UInt16) {
            self.nftOffering.lock(amount: amount)
            self.locked = self.locked + UInt64(amount)
            emit MarketItemLocked(assetId: self.assetId, amount: amount)
        }

        pub fun unlock(amount: UInt16) {
            self.nftOffering.unlock(amount: amount)
            self.locked = self.locked - UInt64(amount)
            emit MarketItemUnlocked(assetId: self.assetId, amount: amount)
        }

        pub fun getLocked(): UInt64 {
            return self.locked
        }

        pub fun getShares(): {String:UFix64} {
            return self.shares
        }

        pub fun setPrice(price: UFix64) {
            pre { self.locked == (0 as UInt64): "cannot change price due to locked items" }
            self.price = price
        }

        pub fun appendBid(bid: @Bid) {
            let oldBid <- self.bids[bid.id] <- bid
            destroy oldBid
        }

        pub fun acceptBid(id: UInt64) {
            pre { self.bids[id] != nil: "bid not found" }
            let bid = &self.bids[id] as! &Bid
            self.lock(amount: bid.amount)
            emit MarketItemBidAccepted(bidId: id, assetId: bid.assetId)
        }

        pub fun rejectBid(id: UInt64) {
            pre { self.bids[id] != nil: "bid not found" }
            let bid <- self.bids.remove(key: id)
            destroy bid
        }

        destroy() {
            assert(self.locked == (0 as UInt64), message: "cannot destroy market item due to locked items")
            destroy self.nftOffering
            destroy self.bids
        }

        init(assetId: String, price: UFix64, nftOffering: @{NFTOffering}, shares: {String:UFix64}) {
            pre { MintasticNFT.assets[assetId] != nil: "cannot find asset" }
            self.assetId      = assetId
            self.price        = price
            self.nftOffering <- nftOffering
            self.shares       = shares
            self.locked       = 0
            self.bids        <- {}

            assert(shares.length > 0, message: "no recipient(s) found")
            var sum:UFix64 = 0.0
            for share in shares.values {
                sum = sum + share
            }
            assert(sum == 1.0, message: "invalid recipient shares")
        }
    }

    pub fun createMarketItem(assetId: String, price: UFix64, nftOffering: @{NFTOffering}, shares: {String:UFix64}): @MarketItem {
        return <-create MarketItem(assetId: assetId, price: price, nftOffering: <- nftOffering, shares: shares)
    }

    /**
     * This resource interface defines all admin functions of a market store
     */
    pub resource interface MarketStoreAdmin {
        pub fun lock(token: &MarketToken, assetId: String)
        pub fun unlock(token: &MarketToken, assetId: String)
        pub fun lockOffering(token: &MarketToken, assetId: String, amount: UInt16)
        pub fun unlockOffering(token: &MarketToken, assetId: String, amount: UInt16)
    }

    /**
     * This resource interface defines all functions of a market store resource used by the market store owner.
     */
    pub resource interface MarketStoreManager {
        pub fun insert(item: @MarketItem)
        pub fun remove(assetId: String): @MarketItem
    }

    /**
     * This resource interface defines all public functions of a market store resource.
     */
    pub resource interface PublicMarketStore {
        pub fun getAssetIds(): [String]
        pub fun borrowMarketItem(assetId: String): &MarketItem{PublicMarketItem}?
        pub fun buy(assetId: String, amount: UInt16, payment: @Payment, receiver: &{NonFungibleToken.Receiver})
        pub fun bid(ref: String, assetId: String, amount: UInt16, price: UFix64, currency: String, exchangeRate: UFix64)
    }

    /**
     * The MarketStore resource is used to collect all market items for sale.
     * Market items can either be directly bought or can be the target of a bid
     * which needs to be accepted by the owner of the market store in order to
     * successfully finish the market item sale activity.
     *
     * A bid can be rejected by the market store owner anytime. The bid owner
     * can also withdraw the bid but only after the expiration of the block limit of a bid.
     */
    pub resource MarketStore : MarketStoreManager, PublicMarketStore, MarketStoreAdmin {
        pub let items: @{String: MarketItem}
        pub let lockedItems: {String:String}

        pub fun insert(item: @MarketItem) {
            let assetId = item.assetId
            let price = item.price
            let oldOffer <- self.items[item.assetId] <- item
            destroy oldOffer

            if (self.owner?.address != nil) {
                emit MarketItemInserted(assetId: assetId, owner: self.owner?.address!, price: price)
            }
        }

        pub fun remove(assetId: String): @MarketItem {
            if (self.owner?.address != nil) {
                emit MarketItemRemoved(assetId: assetId, owner: self.owner?.address!)
            }
            return <-(self.items.remove(key: assetId) ?? panic("missing market item"))
        }

        pub fun buy(assetId: String, amount: UInt16, payment: @Payment, receiver: &{NonFungibleToken.Receiver}) {
            pre {
                self.items[assetId] != nil: "market item not found"
                self.lockedItems[assetId] == nil: "market item is locked"
            }

            let offer = &self.items[assetId] as &MarketItem
            let price = offer.price * UFix64(amount)

            if (payment.bid == nil) {
                let ex = "payment mismatch: ".concat(payment.amount.toString()).concat(" != ").concat(price.toString())
                assert(price == payment.amount, message: ex)
            }
            else {
                let bid <- offer.bids.remove(key: payment.bid!)!
                let price2 = (bid.price * UFix64(bid.amount))
                let ex = "payment mismatch: ".concat(payment.amount.toString()).concat(" != ").concat(price2.toString())
                let ex2 = "bid amount mismatch: ".concat(amount.toString()).concat(" != ").concat(bid.amount.toString())

                assert(payment.amount == price2, message: ex)
                assert(amount == bid.amount, message: ex2)
                destroy bid
            }

            let soldOut = offer.sell(nftReceiver: receiver, payment: <-payment, amount: amount)
            if (soldOut) {
                destroy self.remove(assetId: assetId)
                if (self.owner?.address != nil) {
                    emit MarketItemSoldOut(assetId: assetId, owner: self.owner?.address!)
                }
            }
        }

        pub fun bid(ref: String, assetId: String, amount: UInt16, price: UFix64, currency: String, exchangeRate: UFix64) {
            let bid <- create Bid(ref: ref, assetId: assetId, amount: amount, price: price, currency: currency, exchangeRate: exchangeRate)
            let item = &self.items[assetId] as &MarketItem
            item.appendBid(bid: <- bid)
        }

        pub fun lock(token: &MarketToken, assetId: String) {
            self.lockedItems[assetId] = assetId
        }

        pub fun unlock(token: &MarketToken, assetId: String) {
            self.lockedItems.remove(key: assetId)
        }

        pub fun lockOffering(token: &MarketToken, assetId: String, amount: UInt16) {
            pre { self.items[assetId] != nil: "asset not found" }
            let item = &self.items[assetId] as! &MarketItem
            item.lock(amount: amount)
        }

        pub fun unlockOffering(token: &MarketToken, assetId: String, amount: UInt16) {
            pre { self.items[assetId] != nil: "asset not found" }
            let item = &self.items[assetId] as! &MarketItem
            item.unlock(amount: amount)
        }

        pub fun getAssetIds(): [String] {
            return self.items.keys
        }

        pub fun borrowMarketItem(assetId: String): &MarketItem{PublicMarketItem}? {
            if self.items[assetId] == nil { return nil }
            else { return &self.items[assetId] as &MarketItem{PublicMarketItem} }
        }

        destroy() {
            destroy self.items
        }

        init() {
            self.items <- {}
            self.lockedItems = {}
        }
    }

    pub fun createMarketStore(): @MarketStore {
        return <-create MarketStore()
    }

    pub fun createListOffer(tokenIds: [UInt64], assetId: String, provider: Capability<&{NonFungibleToken.Provider}>): @ListOffering {
        return <- create ListOffering(tokenIds: tokenIds, assetId: assetId, provider: provider)
    }

    pub fun createLazyOffer(assetId: String, minter: @MintasticNFT.Minter): @LazyOffering {
        return <- create LazyOffering(assetId: assetId, minter: <- minter)
    }

    /**
     * This resource is used by the administrator as an argument of a public function
     * in order to restrict access to that function.
     */
    pub resource MarketToken {}

    /*
     * This resource is the administrator object of the mintastic market.
     * It can be used to alter the payment mechanisms without redeploying the contract.
     */
    pub resource MarketAdmin {
        pub fun setMarketFee(key: UFix64, value: UFix64) {
            pre {
                key > 0.0: "market fee key must be greater than zero"
                value <= 1.0: "market fee value must be lower than or equal one"
            }
            MintasticMarket.marketFees[key] = value
        }
        pub fun removeMarketFee(key: UFix64) {
            MintasticMarket.marketFees.remove(key: key)
        }
        pub fun createPayment(ref: String, amount: UFix64, currency: String, exchangeRate: UFix64, bid: UInt64?): @Payment {
            return <- create Payment(ref: ref, amount: amount, currency: currency, exchangeRate: exchangeRate, bid: bid)
        }
    }

    init() {
        self.MintasticMarketStorePublicPath  = /public/MintasticMarketStore
        self.MintasticMarketAdminStoragePath = /storage/MintasticMarketAdmin
        self.MintasticMarketStoreStoragePath = /storage/MintasticMarketStore
        self.MintasticMarketTokenStoragePath = /storage/MintasticMarketToken

        self.totalPayments = 0
        self.totalBids     = 0
        self.marketFees    = {}

        self.account.save(<- create MarketAdmin(), to: self.MintasticMarketAdminStoragePath)
        self.account.save(<- create MarketStore(), to: self.MintasticMarketStoreStoragePath)
        self.account.save(<- create MarketToken(), to: self.MintasticMarketTokenStoragePath)
        self.account.link<&{MintasticMarket.PublicMarketStore, MintasticMarket.MarketStoreAdmin}>(self.MintasticMarketStorePublicPath, target: self.MintasticMarketStoreStoragePath)
    }
}
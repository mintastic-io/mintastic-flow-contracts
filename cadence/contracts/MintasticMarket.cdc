import NonFungibleToken from 0xNonFungibleToken
import MintasticNFT from 0xMintasticNFT
import FungibleToken from 0xFungibleToken
import MintasticCredit from 0xMintasticCredit

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
    pub event MarketItemAccepted(assetId: String)
    pub event MarketItemInserted(assetId: String, owner: Address, price: UFix64)
    pub event MarketItemRemoved (assetId: String, owner: Address)
    pub event MarketItemBidAccepted(bidId: UInt64)
    pub event MarketItemBidRejected(bidId: UInt64)

    access(self) let marketFees:     {UFix64: UFix64}
    access(self) var bidRegistry:    @MintasticCredit.BidRegistry
    access(self) let paymentRouters: @{String: {MintasticCredit.PaymentRouter}}

    /**
     * Resource interface which can be used to read public information about a market item.
     */
    pub resource interface PublicMarketItem {
        pub let assetId:     String
        pub var price:       UFix64
        pub let bids:        {UInt64:Int}
        pub fun getSupply(): Int
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
            assert(!MintasticNFT.lockedAssets.contains(self.assetId), message: "asset is locked")
            let collection <- MintasticNFT.createEmptyCollection()
            var a:UInt16 = 0
            while a < amount {
                a = a + (1 as UInt16)
                let tokenId = self.tokenIds.removeFirst()
                assert(!MintasticNFT.lockedTokens.contains(tokenId), message: "token is locked")
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
        pub let assetId:         String
        pub var locked:          UInt64
        access(self) let minter: &MintasticNFT.NFTMinter

        pub fun provide(amount: UInt16): @NonFungibleToken.Collection {
            pre { self.getSupply() >= Int(amount): "supply/demand mismatch" }
            assert((self.getSupply() - Int(self.locked)) >= Int(amount), message: "supply/demand mismatch due to locked elements")
            assert(!MintasticNFT.lockedAssets.contains(self.assetId), message: "asset is locked")
            return <- self.minter.mint(assetId: self.assetId, amount: amount)
        }

        pub fun getSupply(): Int {
            return Int(MintasticNFT.maxSupplies[self.assetId]! - MintasticNFT.curSupplies[self.assetId]!)
        }

        pub fun lock(amount: UInt16) {
            pre { self.getSupply() >= Int(amount): "not enough elements to lock" }
            self.locked = self.locked + UInt64(amount)
        }

        pub fun unlock(amount: UInt16) {
            pre { self.locked >= UInt64(amount): "not enough elements to unlock" }
            self.locked = self.locked - UInt64(amount)
        }

        init(assetId: String, minter: &MintasticNFT.NFTMinter) {
            self.assetId = assetId
            self.minter  = minter
            self.locked  = 0
        }
    }

    /**
     * A TimeOffering is a nft offering based on a NFT minter resource and a given block view which means that
     * these NFTs are going to be minted only if the current block view is lower than
     * or equal the given block view.
     */
    pub resource TimeOffering: NFTOffering {
        pub let assetId:         String
        pub let blockView:       UInt64
        pub var locked:          UInt64
        access(self) let minter: &MintasticNFT.NFTMinter

        pub fun provide(amount: UInt16): @NonFungibleToken.Collection {
            pre { self.getSupply() >= Int(amount): "supply/demand mismatch" }
            assert((self.getSupply() - Int(self.locked)) >= Int(amount), message: "supply/demand mismatch due to locked elements")
            assert(!MintasticNFT.lockedAssets.contains(self.assetId), message: "asset is locked")
            assert(getCurrentBlock().view < self.blockView, message: "time offering elapsed")
            return <- self.minter.mint(assetId: self.assetId, amount: amount)
        }

        pub fun getSupply(): Int {
            if (getCurrentBlock().view >= self.blockView) {
                return 0
            }
            return Int(MintasticNFT.maxSupplies[self.assetId]! - MintasticNFT.curSupplies[self.assetId]!)
        }

        pub fun lock(amount: UInt16) {
            pre { self.getSupply() >= Int(amount): "not enough elements to lock" }
            self.locked = self.locked + UInt64(amount)
        }

        pub fun unlock(amount: UInt16) {
            pre { self.locked >= UInt64(amount): "not enough elements to unlock" }
            self.locked = self.locked - UInt64(amount)
        }

        init(assetId: String, blockView: UInt64, minter: &MintasticNFT.NFTMinter) {
            self.assetId   = assetId
            self.blockView = blockView
            self.minter    = minter
            self.locked    = 0
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
        pub let bids:    {UInt64:Int}

        access(self) let nftOffering: @{NFTOffering}
        access(self) let recipients:  {Address:UFix64}

        // Returns a boolean value which indicates if the market item is sold out.
        pub fun accept(nftReceiver: &{NonFungibleToken.Receiver}, payment: @{MintasticCredit.Payment}, amount: UInt16): Bool {
            pre {
                self.nftOffering.getSupply() >= Int(amount): "supply/demand mismatch"
                MintasticMarket.paymentRouters[payment.currency] != nil: "invalid payment currency ".concat(payment.currency)
            }
            let balance = payment.vault.balance
            self.routeServiceShare(payment: <- payment.split(amount: balance * self.getServiceShare(amount: payment.vault.balance)))
            self.routeRoyaltyShare(payment: <- payment.split(amount: balance * MintasticNFT.assets[self.assetId]!.royalty))
            self.routeDefaultShare(payment: <- payment)

            let tokens <- self.nftOffering.provide(amount: amount)
            for key in tokens.getIDs() {
                nftReceiver.deposit(token: <-tokens.withdraw(withdrawID: key))
            }
            destroy tokens

            emit MarketItemAccepted(assetId: self.assetId)
            return self.nftOffering.getSupply() == 0
        }

        access(self) fun routeDefaultShare(payment: @{MintasticCredit.Payment}) {
            let addresses = self.recipients
            let balance = payment.vault.balance
            for address in addresses.keys {
                let addressPayment <- payment.split(amount: balance * addresses[address]!)
                self.routePayment(payment: <- addressPayment, recipient: address)
            }
            assert(payment.vault.balance == 0.0, message: "invalid recipient payments")
            destroy payment
        }

        access(self) fun routeRoyaltyShare(payment: @{MintasticCredit.Payment}) {
            let addresses = MintasticNFT.assets[self.assetId]!.addresses
            let balance = payment.vault.balance
            for address in addresses.keys {
                let addressPayment <- payment.split(amount: balance * addresses[address]!)
                self.routePayment(payment: <- addressPayment, recipient: address)
            }
            assert(payment.vault.balance == 0.0, message: "invalid royalty payments")
            destroy payment
        }

        access(self) fun getServiceShare(amount: UFix64): UFix64 {
            for fee in MintasticMarket.marketFees.keys {
                if (amount <= fee) {
                    return MintasticMarket.marketFees[fee]!
                }
            }
            return 0.025
        }

        access(self) fun routeServiceShare(payment: @{MintasticCredit.Payment}) {
            self.routePayment(payment: <- payment, recipient: MintasticMarket.account.address)
        }

        access(self) fun routePayment(payment: @{MintasticCredit.Payment}, recipient: Address) {
            let paymentService = &MintasticMarket.paymentRouters[payment.currency] as! &{MintasticCredit.PaymentRouter}
            paymentService.route(payment: <- payment, recipient: recipient, assetId: self.assetId)
        }

        pub fun getSupply(): Int {
            return self.nftOffering.getSupply()
        }

        pub fun lock(amount: UInt16) {
            self.nftOffering.lock(amount: amount)
        }

        pub fun unlock(amount: UInt16) {
            self.nftOffering.unlock(amount: amount)
        }

        pub fun setPrice(price: UFix64) {
            self.price = price
            let keys = self.bids.keys
            for key in keys {
                self.bids.remove(key: key)
            }
        }

        destroy() { destroy self.nftOffering }

        init(assetId: String, price: UFix64, nftOffering: @{NFTOffering}, recipients: {Address:UFix64}) {
            pre { MintasticNFT.assets[assetId] != nil: "cannot find asset" }
            self.assetId      = assetId
            self.price        = price
            self.bids         = {}
            self.nftOffering <- nftOffering
            self.recipients   = recipients

            assert(recipients.length > 0, message: "no recipient(s) found")
            var sum:UFix64 = 0.0
            for value in recipients.values {
                sum = sum + value
            }
            assert(sum == 1.0, message: "invalid recipient shares")
        }
    }

    pub fun createMarketItem(assetId: String, price: UFix64, nftOffering: @{NFTOffering}, recipients: {Address:UFix64}): @MarketItem {
        return <-create MarketItem(assetId: assetId, price: price, nftOffering: <- nftOffering, recipients: recipients)
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
        pub fun acceptBid(assetId: String, bidId: UInt64)
        pub fun abortBid(assetId: String, bidId: UInt64)
        pub fun rejectBid(assetId: String, bidId: UInt64, force: Bool)
    }

    /**
     * This resource interface defines all public functions of a market store resource.
     */
    pub resource interface PublicMarketStore {
        pub fun getAssetIds(): [String]
        pub fun borrowMarketItem(assetId: String): &MarketItem{PublicMarketItem}?
        pub fun buy(assetId: String, amount: UInt16, payment: @{MintasticCredit.Payment}, receiver: &{NonFungibleToken.Receiver})
        pub fun bid(assetId: String, amount: UInt16, bidding: @MintasticCredit.Bid)
        pub fun abortBid(assetId: String, bidId: UInt64)
    }

    /**
     * The MarketStore resource is used to collect all market items for sale.
     * Market items can either be directly bought or can be the target of a bid
     * which needs to be accepted by the owner of the market store in order to
     * successfully finish the market item sale activity.
     *
     * A bid can be rejected by the market store owner anytime. The bid owner
     * can also abort the bid but only after the expiration of the block limit of a bid.
     */
    pub resource MarketStore : MarketStoreManager, PublicMarketStore, MarketStoreAdmin {
        pub let items: @{String: MarketItem}
        pub let lockedItems: {String:String}

        pub fun insert(item: @MarketItem) {
            let assetId = item.assetId
            let price = item.price
            let oldOffer <- self.items[item.assetId] <- item
            destroy oldOffer
            emit MarketItemInserted(assetId: assetId, owner: self.owner?.address!, price: price)
        }

        pub fun remove(assetId: String): @MarketItem {
            emit MarketItemRemoved(assetId: assetId, owner: self.owner?.address!)
            return <-(self.items.remove(key: assetId) ?? panic("missing SaleOffer"))
        }

        pub fun buy(assetId: String, amount: UInt16, payment: @{MintasticCredit.Payment}, receiver: &{NonFungibleToken.Receiver}) {
            pre {
                self.items[assetId] != nil: "market item not found"
                self.lockedItems[assetId] == nil: "market item is locked"
                !MintasticNFT.lockedAssets.contains(assetId): "asset is locked"
            }
            let offer = &self.items[assetId] as &MarketItem

            let balance     = payment.vault.balance
            let offerAmount = offer.price * UFix64(amount)
            let lowerAmount = offerAmount - 0.001
            let upperAmount = offerAmount + 0.001

            let ex = "payment mismatch: ".concat(balance.toString()).concat(" : ").concat(offerAmount.toString())
            assert(lowerAmount < balance, message: ex)
            assert(balance < upperAmount, message: ex)

            let soldOut = offer.accept(nftReceiver: receiver, payment: <-payment, amount: amount)
            if (soldOut) { destroy self.remove(assetId: assetId) }
        }

        pub fun bid(assetId: String, amount: UInt16, bidding: @MintasticCredit.Bid) {
            pre {
                self.items[assetId] != nil: "market item not found"
                self.lockedItems[assetId] == nil: "market item is locked"
                !MintasticNFT.lockedAssets.contains(assetId): "asset is locked"
            }
            let offer = &self.items[assetId] as &MarketItem
            let bidId = MintasticMarket.bidRegistry.registerBid(bid: <- bidding)
            offer.bids[bidId] = offer.bids.length
        }

        pub fun abortBid(assetId: String, bidId: UInt64) {
            self.rejectBid(assetId: assetId, bidId: bidId, force: false)
        }

        pub fun rejectBid(assetId: String, bidId: UInt64, force: Bool) {
            pre { MintasticMarket.bidRegistry.bids[bidId] != nil: "bid not found" }
            assert(self.items[assetId] != nil, message: "market item not found")
            let offer = &self.items[assetId] as &MarketItem
            MintasticMarket.bidRegistry.reject(id: bidId, force: force)
            emit MarketItemBidRejected(bidId: bidId)
            offer.bids.remove(key: bidId)
        }

        pub fun acceptBid(assetId: String, bidId: UInt64) {
            pre {
                MintasticMarket.bidRegistry.bids[bidId] != nil: "bid not found"
                self.items[assetId] != nil: "asset not found"
                self.lockedItems[assetId] == nil: "market item is locked"
            }
            let bid <- MintasticMarket.bidRegistry.remove(id: bidId)
            let item = &self.items[assetId] as &MarketItem

            let soldOut = item.accept(nftReceiver: bid.receiver.borrow()!, payment: <- bid.accept(), amount: bid.amount)
            if (soldOut) { destroy self.remove(assetId: assetId) }
            emit MarketItemBidAccepted(bidId: bidId)
            destroy bid
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

    pub fun createLazyOffer(assetId: String, minter: &MintasticNFT.NFTMinter): @LazyOffering {
        return <- create LazyOffering(assetId: assetId, minter: minter)
    }

    pub fun createTimeOffer(assetId: String, blockView: UInt64, minter: &MintasticNFT.NFTMinter): @TimeOffering {
        return <- create TimeOffering(assetId: assetId, blockView: blockView, minter: minter)
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
                value >= 0.0: "market fee value must be greater than zero"
                value <= 1.0: "market fee value must be lower than or equal one"
            }
            MintasticMarket.marketFees[key] = value
        }
        pub fun removeMarketFee(key: UFix64) {
            MintasticMarket.marketFees.remove(key: key)
        }
        pub fun setPaymentRouter(currency: String, paymentRouter: @{MintasticCredit.PaymentRouter}) {
            let prevPaymentRouter <- MintasticMarket.paymentRouters[currency] <- paymentRouter
            destroy prevPaymentRouter
        }
        pub fun getBidRegistry(): &MintasticCredit.BidRegistry {
            return &MintasticMarket.bidRegistry as &MintasticCredit.BidRegistry
        }
        pub fun setBidRegistry(bidRegistry: @MintasticCredit.BidRegistry) {
            let prev <- MintasticMarket.bidRegistry <- bidRegistry
            destroy prev
        }
        pub fun setBlockLimit(blockLimit: UInt64) {
            let bidRegistry = &MintasticMarket.bidRegistry as &MintasticCredit.BidRegistry
            bidRegistry.setBlockLimit(blockLimit: blockLimit)
        }
    }

    init() {
        self.marketFees     = {}
        self.paymentRouters <- {}
        self.bidRegistry    <- MintasticCredit.createBidRegistry(blockLimit: 0)
        self.account.save(<- create MarketAdmin(), to: /storage/MintasticMarketAdmin)
        self.account.save(<- create MarketStore(), to: /storage/MintasticMarketStore)
        self.account.save(<- create MarketToken(), to: /storage/MintasticMarketToken)
        self.account.link<&{MintasticMarket.PublicMarketStore}>(/public/MintasticMarketStore, target: /storage/MintasticMarketStore)
    }
}
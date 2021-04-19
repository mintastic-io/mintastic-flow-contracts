import FungibleToken from 0xFungibleToken
import NonFungibleToken from 0xNonFungibleToken

/*
 * The mintastic credit is the internal currency of mintastic.
 * Either fiat payments (off-chain) as well as cryptocurrency payments (on-chain) can be realized
 * by transforming the source currency to the mintastic credit target currency.
 *
 * The MintasticCredit contract supports the exchange of the currencies natively by the use of
 * the PaymentExchange implementations.
 */
pub contract MintasticCredit: FungibleToken {

    pub var totalSupply:        UFix64
    access(self) let exchanges: @{String: {PaymentExchange}}

    pub event TokensInitialized(initialSupply: UFix64)
    pub event TokensWithdrawn(amount: UFix64, from: Address?)
    pub event TokensDeposited(amount: UFix64, to: Address?)
    pub event TokensMinted(amount: UFix64)
    pub event TokensBurned(amount: UFix64)

    /**
      * Standard FungibleToken vault implementation.
      * Mintastic credits have no max supply because mintastic credits were burned after a payment.
      */
    pub resource Vault: FungibleToken.Provider, FungibleToken.Receiver, FungibleToken.Balance {
        pub var balance: UFix64

        init(balance: UFix64) {
            self.balance = balance
        }

        pub fun withdraw(amount: UFix64): @FungibleToken.Vault {
            self.balance = self.balance - amount
            emit TokensWithdrawn(amount: amount, from: self.owner?.address)
            return <-create Vault(balance: amount)
        }

        pub fun deposit(from: @FungibleToken.Vault) {
            let vault <- from as! @MintasticCredit.Vault
            self.balance = self.balance + vault.balance
            emit TokensDeposited(amount: vault.balance, to: self.owner?.address)
            vault.balance = 0.0
            destroy vault
        }

        destroy() {
            MintasticCredit.totalSupply = MintasticCredit.totalSupply - self.balance
        }
    }

    /**
     * The administrator resource can be used to get direct access to the
     * contract internal resources. By the use of this resource tokens can
     * be minted or burned and the payment exchange functionality
     * can be modified.
     */
    pub resource Administrator {
        pub fun createMinter(allowedAmount: UFix64): @Minter {
            return <-create Minter(allowedAmount: allowedAmount)
        }
        pub fun createBurner(): @Burner {
            return <-create Burner()
        }
        pub fun setPaymentExchange(currency: String, exchange: @{PaymentExchange}) {
            let prevExchange <- MintasticCredit.exchanges[currency] <- exchange
            destroy prevExchange
        }
        pub fun setExchangeRate(currency: String, exchangeRate: UFix64) {
            pre { MintasticCredit.exchanges[currency] != nil: "unknown currency ".concat(currency) }
            let exchange = &MintasticCredit.exchanges[currency] as &{PaymentExchange}
            exchange.setExchangeRate(exchangeRate: exchangeRate)
        }
        pub fun createCredits(amount: UFix64): @MintasticCredit.Vault {
            let minter <- self.createMinter(allowedAmount: amount)
            let vault <- minter.mint(amount: amount)
            destroy minter
            return <- vault
        }
        pub fun createMinterFactory(): @MinterFactory {
            return <- create MinterFactory()
        }
    }

    /**
     * A minter factory implementation is used by a payment service resource
     * in order to create mintastic credits on the fly.
     */
    pub resource MinterFactory {
        pub fun createMinter(allowedAmount: UFix64): @Minter {
            return <-create Minter(allowedAmount: allowedAmount)
        }
    }

    // By the use of this resource the contract admin is able to mint tokens.
    pub resource Minter {
        pub var allowedAmount: UFix64

        pub fun mint(amount: UFix64): @MintasticCredit.Vault {
            pre {
                amount > 0.0: "Amount minted must be greater than zero"
                amount <= self.allowedAmount: "Amount minted must be less than the allowed amount"
            }
            MintasticCredit.totalSupply = MintasticCredit.totalSupply + amount
            self.allowedAmount = self.allowedAmount - amount
            emit TokensMinted(amount: amount)
            return <-create Vault(balance: amount)
        }

        init(allowedAmount: UFix64) {
            self.allowedAmount = allowedAmount
        }
    }

    // By the use of this resource the contract admin is able to burn tokens from a token vault.
    pub resource Burner {
        pub fun burnTokens(from: @FungibleToken.Vault) {
            let vault <- from as! @MintasticCredit.Vault
            let amount = vault.balance
            emit TokensBurned(amount: amount)
            destroy vault
        }
    }

    /**
     * The resource interface definition for all payment implementations.
     * A payment resource is used to buy a mintastic asset, and it is created
     * by an PaymentExchange resource.
     */
    pub resource interface Payment {
        pub let vault:    @FungibleToken.Vault
        pub let currency: String
        pub let exchangeRate: UFix64
        pub fun split(amount: UFix64): @{Payment}
    }

    /**
     * A PaymentExchange resource is used to transform a fungible token vault into
     * a Payment instance, which can be used to buy a mintastic asset.
     */
    pub resource interface PaymentExchange {
        pub var exchangeRate: UFix64
        pub fun setExchangeRate(exchangeRate: UFix64)
        pub fun exchange(vault: @FungibleToken.Vault): @{Payment}
    }

    /**
     * PaymentRouter resources are used to route a payment to a recipient address.
     */
    pub resource interface PaymentRouter {
        pub fun route(payment: @{Payment}, recipient: Address, assetId: String)
    }

    /**
     * The bid resource is used to create a bidding for a mintastic asset. If the bid is accepted it is automatically
     * transformed into a payment by using a payment exchange.
     */
    pub resource Bid {
        pub let vault:    @FungibleToken.Vault
        pub let reversal: Capability<&{FungibleToken.Receiver}>
        pub let receiver: Capability<&{NonFungibleToken.Receiver}>
        pub let currency: String
        pub let amount:   UInt16

        init(vault: @FungibleToken.Vault, reversal: Capability<&{FungibleToken.Receiver}>, receiver: Capability<&{NonFungibleToken.Receiver}>, currency: String, amount: UInt16) {
            pre { reversal.borrow() != nil : "cannot borrow token receiver" }
            self.vault <- vault
            self.reversal = reversal
            self.receiver = receiver
            self.currency = currency
            self.amount   = amount
        }

        pub fun accept(): @{Payment} {
            let vault <- self.vault.withdraw(amount: self.vault.balance)
            return <- MintasticCredit.exchange(vault: <- vault, currency: self.currency)
        }

        destroy() {
            self.reversal.borrow()!.deposit(from: <- self.vault)
        }
    }

    /*
     * This resource is used to register bids in order to access them during a asset sell activity.
     * Bids registered in this registry can be publicly rejected after the block limit expired.
     *
     * The block limit is initialized with zero, which means that bids can only be registered
     * after the block limit was set to a value greater than zero.
     */
    pub resource BidRegistry {
        pub var totalBids:  UInt64
        pub var blockLimit: UInt64
        pub let bids:       @{UInt64: MintasticCredit.Bid}
        pub let expireMap:  {UInt64: UInt64}

        pub fun registerBid(bid: @MintasticCredit.Bid): UInt64 {
            pre { self.blockLimit > (0 as UInt64): "the bid registry is not initialized" }
            self.totalBids = self.totalBids + (1 as UInt64)
            self.expireMap[self.totalBids] = getCurrentBlock().view + self.blockLimit

            let prev <- self.bids[self.totalBids] <- bid
            destroy prev

            return self.totalBids
        }

        pub fun getBidIds(): [UInt64] {
            return self.bids.keys
        }

        pub fun getBidInfo(id: UInt64): {String:String} {
            pre { self.bids[id] != nil: "unknown bid id" }
            let bid = &self.bids[id] as &MintasticCredit.Bid
            return {
                "balance"  : bid.vault.balance.toString(),
                "amount"   : bid.amount.toString(),
                "currency" : bid.currency
            }
        }

        pub fun remove(id: UInt64): @Bid {
            pre {
                self.bids[id] != nil: "unknown bid id"
                self.expireMap[id] != nil: "unknown bid id"
                getCurrentBlock().view < self.expireMap[id]! : "bid already expired"
            }
            self.expireMap.remove(key: id)
            return <- self.bids.remove(key: id)!
        }

        pub fun reject(id: UInt64, force: Bool) {
            pre {
                self.bids[id] != nil: "unknown bid id"
                self.expireMap[id] != nil: "unknown bid id"
            }
            if (!force) {
                assert(getCurrentBlock().view > self.expireMap[id]!, message: "bid not yet expired")
            }
            self.expireMap.remove(key: id)
            let bid <- self.bids.remove(key: id)!

            destroy bid
        }

        pub fun setBlockLimit(blockLimit: UInt64) {
            pre { blockLimit > (0 as UInt64): "block limit must be greater than zero" }
            self.blockLimit = blockLimit
        }

        init(blockLimit: UInt64) {
            self.totalBids  = 0
            self.blockLimit = 0
            self.bids       <- {}
            self.expireMap  = {}
        }
        destroy() { destroy self.bids }
    }

    pub fun createEmptyVault(): @Vault {
        return <-create Vault(balance: 0.0)
    }

    pub fun createBid(vault: @FungibleToken.Vault, reversal: Capability<&{FungibleToken.Receiver}>, receiver: Capability<&{NonFungibleToken.Receiver}>, currency: String, amount: UInt16):@Bid {
        pre {
            reversal.borrow() != nil: "cannot borrow reversal reference"
            receiver.borrow() != nil: "cannot borrow receiver reference"
        }
        return <- create Bid(vault: <- vault, reversal: reversal, receiver: receiver, currency: currency, amount: amount)
    }

    pub fun createBidRegistry(blockLimit: UInt64): @BidRegistry {
        return <- create BidRegistry(blockLimit: blockLimit)
    }

    pub fun exchange(vault: @FungibleToken.Vault, currency: String): @{Payment} {
        pre { MintasticCredit.exchanges[currency] != nil : "cannot change to mintastic credits from ".concat(currency) }
        let exchange: &{PaymentExchange} = &MintasticCredit.exchanges[currency] as &{PaymentExchange}
        return <- exchange.exchange(vault: <- vault)
    }

    access(account) fun createMinter(amount: UFix64): @Minter {
        return <-create Minter(allowedAmount: amount)
    }

    pub fun getExchangeRate(currency: String): UFix64 {
        pre { MintasticCredit.exchanges[currency] != nil : "cannot change to mintastic credits from ".concat(currency) }
        let exchange = &self.exchanges[currency] as &{PaymentExchange}
        return exchange.exchangeRate as UFix64
    }

    init() {
        self.totalSupply = 0.0
        self.exchanges  <- {}

        self.account.save(<- create Administrator(), to: /storage/MintasticCreditAdmin)
        self.account.save(<- MintasticCredit.createEmptyVault(), to: /storage/MintasticCredits)

        self.account.link<&{FungibleToken.Receiver}>(/public/MintasticCredits, target: /storage/MintasticCredits)
        emit TokensInitialized(initialSupply: self.totalSupply)
    }
}
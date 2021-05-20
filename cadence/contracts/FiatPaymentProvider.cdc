import MintasticCredit from 0xMintasticCredit
import MintasticMarket from 0xMintasticMarket
import FungibleToken from 0xFungibleToken

/**
 * The FiatPaymentProvider contract is used to support platform payments with off-chain fiat currencies.
 *
 * A FiatPaid event is emitted after a successful fiat payment transaction.
 */
pub contract FiatPaymentProvider {

    pub var totalPayments: UInt64

    pub let FiatPaymentProviderAdminStoragePath: StoragePath

    /**
     * The minter factory implementation is used to create a new
     * mintastic credit minter on the fly.
     */
    access(self) let minterFactory: @MintasticCredit.MinterFactory

    /**
     * The event which is emitted after a successful fiat payment transaction
     */
    pub event FiatPaid(assetId: String, amount: UFix64, currency: String, exchangeRate: UFix64, recipient: Address, pid: UInt64)

    /**
     * The event which is emitted after a successful exchange rate update
     */
     pub event ExchangeRateChanged(currency: String, prevExchangeRate: UFix64, nextExchangeRate: UFix64, blockHeight: UInt64)

    /**
     * The fiat payment implementation.
     */
    pub resource FiatPayment: MintasticCredit.Payment {
        pub let id:           UInt64
        pub let vault:        @FungibleToken.Vault
        pub let currency:     String
        pub let exchangeRate: UFix64

        init(vault: @MintasticCredit.Vault, currency: String, exchangeRate: UFix64) {
            self.id = FiatPaymentProvider.totalPayments
            FiatPaymentProvider.totalPayments = FiatPaymentProvider.totalPayments + (1 as UInt64)

            self.vault   <- vault
            self.currency = currency
            self.exchangeRate = exchangeRate
        }

        pub fun split(amount: UFix64): @{MintasticCredit.Payment} {
            let vault <- self.vault.withdraw(amount: amount) as! @MintasticCredit.Vault
            return <- create FiatPayment(vault: <- vault, currency: self.currency, exchangeRate: self.exchangeRate)
        }

        destroy() { destroy self.vault }
    }

    pub struct ExchangeRate {
        pub let prevExchangeRate: UFix64
        pub let nextExchangeRate: UFix64
        pub let blockHeight: UInt64

        init(prevExchangeRate: UFix64, nextExchangeRate: UFix64, blockHeight: UInt64) {
            self.prevExchangeRate = prevExchangeRate
            self.nextExchangeRate = nextExchangeRate
            self.blockHeight = blockHeight
        }
    }

    /**
     * A payment exchange implementation which creates mintastic credit tokens
     * after a successful off-chain fiat payment. The FiatPaymentExchange has a exchangeRate
     * attribute which is used as the exchange rate between the two currencies.
     */
    pub resource FiatPaymentExchange : MintasticCredit.PaymentExchange {
        pub let currency: String
        pub var curExchangeRate: UFix64
        pub var exchangeRate: ExchangeRate

        pub fun exchange(vault: @FungibleToken.Vault): @{MintasticCredit.Payment} {
            let creditVault <- vault as! @MintasticCredit.Vault
            let amount = creditVault.balance * self.getExchangeRate()

            let minter <- FiatPaymentProvider.minterFactory.createMinter(allowedAmount: amount)
            let paymentVault  <- minter.mint(amount: amount)

            destroy minter
            destroy creditVault

            return <-create FiatPayment(vault: <-paymentVault, currency: self.currency, exchangeRate: self.getExchangeRate())
        }

        /**
         * Setter for the init rate attribute of the payment exchange.
         */
        pub fun setExchangeRate(exchangeRate: UFix64, blockDelay: UInt8) {
            pre { exchangeRate > 0.0: "exchange rate must be greater than zero" }
            let blockHeight = getCurrentBlock().height + UInt64(blockDelay)
            self.exchangeRate = ExchangeRate(prevExchangeRate: self.getExchangeRate(), nextExchangeRate: exchangeRate, blockHeight: blockHeight)
        }

        pub fun getExchangeRate(): UFix64 {
            if (self.exchangeRate.blockHeight <= getCurrentBlock().height) {
                if (self.curExchangeRate != self.exchangeRate.nextExchangeRate) {
                    self.curExchangeRate = self.exchangeRate.nextExchangeRate
                    emit ExchangeRateChanged(currency: self.currency,
                                             prevExchangeRate: self.exchangeRate.prevExchangeRate,
                                             nextExchangeRate: self.exchangeRate.nextExchangeRate,
                                             blockHeight: getCurrentBlock().height)
                }
                return self.exchangeRate.nextExchangeRate
            }
            return self.exchangeRate.prevExchangeRate
        }

        init(currency: String, exchangeRate: UFix64) {
            self.currency = currency
            self.exchangeRate = ExchangeRate(prevExchangeRate: exchangeRate, nextExchangeRate: exchangeRate, blockHeight: getCurrentBlock().height)
            self.curExchangeRate = exchangeRate
        }
    }

    /**
     * PaymentRouter implementation which is used to emit an event
     * which indicates an off-chain payment service to transfer
     * a fiat payment to a recipient. The mintastic credit vault
     * will be destroyed after the routing.
     */
    pub resource FiatPaymentRouter : MintasticCredit.PaymentRouter {

        pub let currency: String

        pub fun route(payment: @{MintasticCredit.Payment}, recipient: Address, assetId: String) {
            pre { payment.currency == self.currency: "unsupported currency: ".concat(payment.currency) }
            let fiatPayment <- payment as! @FiatPayment

            emit FiatPaid(assetId: assetId, amount: fiatPayment.vault.balance, currency: fiatPayment.currency, exchangeRate: fiatPayment.exchangeRate, recipient: recipient, pid: fiatPayment.id)
            destroy fiatPayment
        }

        init(currency: String) {
            self.currency = currency
        }

    }

    /**
     * The administrator resource can be used to get direct access to the
     * contract internal resources.
     */
    pub resource Administrator {
        pub fun createRouter(currency: String): @FiatPaymentRouter {
            return <- create FiatPaymentRouter(currency: currency)
        }
        pub fun createExchange(currency: String, exchangeRate: UFix64): @FiatPaymentExchange {
            return <- create FiatPaymentExchange(currency: currency, exchangeRate: exchangeRate)
        }
    }

    init() {
        self.totalPayments = 0

        self.FiatPaymentProviderAdminStoragePath = /storage/FiatPaymentProviderAdmin
        self.account.save(<- create Administrator(), to: self.FiatPaymentProviderAdminStoragePath)

        let admin1 = self.account.borrow<&MintasticMarket.MarketAdmin>(from: MintasticMarket.MintasticMarketAdminStoragePath)!
        admin1.setPaymentRouter(currency: "eur", paymentRouter: <- create FiatPaymentRouter(currency: "eur"))
        admin1.setPaymentRouter(currency: "usd", paymentRouter: <- create FiatPaymentRouter(currency: "usd"))

        let admin2 = self.account.borrow<&MintasticCredit.Administrator>(from: MintasticCredit.MintasticCreditAdminStoragePath)!
        admin2.setPaymentExchange(currency: "eur", exchange: <- create FiatPaymentExchange(currency: "eur", exchangeRate: 1.0))
        admin2.setPaymentExchange(currency: "usd", exchange: <- create FiatPaymentExchange(currency: "usd", exchangeRate: 0.8345))

        self.minterFactory <- admin2.createMinterFactory()
    }

}
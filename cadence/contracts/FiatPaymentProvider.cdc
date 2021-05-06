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

    /**
     * A payment exchange implementation which creates mintastic credit tokens
     * after a successful off-chain fiat payment. The FiatPaymentExchange has a exchangeRate
     * attribute which is used as the exchange rate between the two currencies.
     */
    pub resource FiatPaymentExchange : MintasticCredit.PaymentExchange {
        pub let currency: String
        pub var exchangeRate: UFix64

        pub fun exchange(vault: @FungibleToken.Vault): @{MintasticCredit.Payment} {
            let creditVault <- vault as! @MintasticCredit.Vault
            let amount = creditVault.balance * self.exchangeRate

            let minter <- FiatPaymentProvider.minterFactory.createMinter(allowedAmount: amount)
            let paymentVault  <- minter.mint(amount: amount)

            destroy minter
            destroy creditVault

            return <-create FiatPayment(vault: <-paymentVault, currency: self.currency, exchangeRate: self.exchangeRate)
        }

        /**
         * Setter for the init rate attribute of the payment exchange.
         */
        pub fun setExchangeRate(exchangeRate: UFix64) {
            pre { exchangeRate > 0.0: "exchange rate must be greater than zero" }
            self.exchangeRate = exchangeRate
        }

        init(currency: String, exchangeRate: UFix64) {
            self.currency = currency
            self.exchangeRate = exchangeRate
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

    init() {
        self.totalPayments = 0

        let admin1 = self.account.borrow<&MintasticMarket.MarketAdmin>(from: /storage/MintasticMarketAdmin)!
        admin1.setPaymentRouter(currency: "eur", paymentRouter: <- create FiatPaymentRouter(currency: "eur"))
        admin1.setPaymentRouter(currency: "usd", paymentRouter: <- create FiatPaymentRouter(currency: "usd"))

        let admin2 = self.account.borrow<&MintasticCredit.Administrator>(from: /storage/MintasticCreditAdmin)!
        admin2.setPaymentExchange(currency: "eur", exchange: <- create FiatPaymentExchange(currency: "eur", exchangeRate: 1.0))
        admin2.setPaymentExchange(currency: "usd", exchange: <- create FiatPaymentExchange(currency: "usd", exchangeRate: 0.8345))

        self.minterFactory <- admin2.createMinterFactory()
    }

}
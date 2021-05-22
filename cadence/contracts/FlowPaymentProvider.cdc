import MintasticCredit from 0xMintasticCredit
import MintasticMarket from 0xMintasticMarket
import FungibleToken from 0xFungibleToken
import FlowToken from 0xFlowToken

/**
 * The FlowPaymentProvider contract is used to support platform payments with the flow token cryptocurrency.
 * The contract itself has a flow token vault in order to lock tokens before they get routet to the recipient.
 *
 * A FlowPayment event is emitted after a successful flow payment transaction.
 *
 * The contract defines an Administrator resource which can be used to get direct access to the contract
 * internal flow token vault.
 */
pub contract FlowPaymentProvider {

    pub var totalPayments: UInt64

    pub let FlowPaymentProviderAdminStoragePath: StoragePath

    /**
     * The contract internal flow token vault.
     * Flow tokens get locked into this vault until they get routed to the recipient.
     */
    access(self) let vault: @FungibleToken.Vault

    /**
     * The minter factory implementation is used to create a new
     * mintastic credit minter on the fly.
     */
    access(self) let minterFactory: @MintasticCredit.MinterFactory

    /**
     * The event which is emitted after a successful flow payment transaction
     */
    pub event FlowPaid(assetId: String, amount: UFix64, currency: String, exchangeRate: UFix64, recipient: Address, pid: UInt64)

    /**
     * The event which is emitted after a successful exchange rate update
     */
     pub event ExchangeRateChanged(prevExchangeRate: UFix64, nextExchangeRate: UFix64, blockHeight: UInt64)


    /**
     * The flow payment implementation.
     */
    pub resource FlowPayment: MintasticCredit.Payment {
        pub let id: UInt64
        pub let vault:    @FungibleToken.Vault
        pub let currency: String
        pub let exchangeRate: UFix64

        init(vault: @MintasticCredit.Vault, currency: String, exchangeRate: UFix64) {
            self.id = FlowPaymentProvider.totalPayments
            FlowPaymentProvider.totalPayments = FlowPaymentProvider.totalPayments + (1 as UInt64)

            self.vault   <- vault
            self.currency = currency
            self.exchangeRate = exchangeRate
        }

        pub fun split(amount: UFix64): @{MintasticCredit.Payment} {
            let vault <- self.vault.withdraw(amount: amount) as! @MintasticCredit.Vault
            return <- create FlowPayment(vault: <- vault, currency: self.currency, exchangeRate: self.exchangeRate)
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
     * A payment exchange implementation which converts flow tokens to
     * mintastic credit tokens. The FlowPaymentExchange has a exchangeRate
     * attribute which is used as the exchange rate between the two currencies.
     */
    pub resource FlowPaymentExchange : MintasticCredit.PaymentExchange {
        pub var curExchangeRate: UFix64
        pub var exchangeRate: ExchangeRate

        pub fun exchange(vault: @FungibleToken.Vault): @{MintasticCredit.Payment} {
            pre { self.getExchangeRate() > 0.0: "flow payment is not initialized" }

            let creditVault <- vault as! @FlowToken.Vault
            let amount = creditVault.balance * self.getExchangeRate()

            let minter <- FlowPaymentProvider.minterFactory.createMinter(allowedAmount: amount)
            let paymentVault  <- minter.mint(amount: amount)

            FlowPaymentProvider.vault.deposit(from: <- creditVault)
            destroy minter

            return <- create FlowPayment(vault: <- paymentVault, currency: "flow", exchangeRate: self.getExchangeRate())
        }

        pub fun getExchangeRate(): UFix64 {
            if (self.exchangeRate.blockHeight <= getCurrentBlock().height) {
                if (self.curExchangeRate != self.exchangeRate.nextExchangeRate) {
                    self.curExchangeRate = self.exchangeRate.nextExchangeRate
                    emit ExchangeRateChanged(prevExchangeRate: self.exchangeRate.prevExchangeRate,
                                             nextExchangeRate: self.exchangeRate.nextExchangeRate,
                                             blockHeight: getCurrentBlock().height)
                }
                return self.exchangeRate.nextExchangeRate
            }
            return self.exchangeRate.prevExchangeRate
        }

        /**
         * Setter for the init rate attribute of the payment exchange.
         */
        pub fun setExchangeRate(exchangeRate: UFix64, blockDelay: UInt8) {
            pre { exchangeRate > 0.0: "exchange rate must be greater than zero" }
            let blockHeight = getCurrentBlock().height + UInt64(blockDelay)
            self.exchangeRate = ExchangeRate(prevExchangeRate: self.getExchangeRate(), nextExchangeRate: exchangeRate, blockHeight: blockHeight)
        }

        init(exchangeRate: UFix64) {
            self.exchangeRate = ExchangeRate(prevExchangeRate: exchangeRate, nextExchangeRate: exchangeRate, blockHeight: getCurrentBlock().height)
            self.curExchangeRate = exchangeRate
        }
    }

    /**
     * PaymentRouter implementation which is used to route an amount
     * of flow tokens to a recipient. The amount of flow tokens are
     * withdrawn from previously locked flow tokens of the contract
     * internal flow-token vault.
     */
    pub resource FlowPaymentRouter : MintasticCredit.PaymentRouter {

        pub fun route(payment: @{MintasticCredit.Payment}, recipient: Address, assetId: String) {
            pre { payment.currency == "flow": "unsupported currency: ".concat(payment.currency) }
            let flowPayment <- payment as! @FlowPayment

            let capability = getAccount(recipient).getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
            let receiver = capability.borrow() ?? panic("no fungible token receiver found")

            let amount = flowPayment.vault.balance / flowPayment.exchangeRate
            let vault <- FlowPaymentProvider.vault.withdraw(amount: amount)
            receiver.deposit(from: <- vault)

            emit FlowPaid(assetId: assetId, amount: flowPayment.vault.balance, currency: flowPayment.currency, exchangeRate: flowPayment.exchangeRate, recipient: recipient, pid: flowPayment.id)
            destroy flowPayment
        }

    }

    /**
     * The administrator resource can be used to get direct access to the
     * contract internal flow-token vault. This can be useful to rollback
     * a flow token payment during a transaction rollback scenario.
     */
    pub resource Administrator {
        pub fun withdraw(amount: UFix64): @FungibleToken.Vault {
            return <- FlowPaymentProvider.vault.withdraw(amount: amount)
        }
        pub fun deposit(vault: @FungibleToken.Vault) {
            FlowPaymentProvider.vault.deposit(from: <- vault)
        }
        pub fun createRouter(): @FlowPaymentRouter {
            return <- create FlowPaymentRouter()
        }
        pub fun createExchange(exchangeRate: UFix64): @FlowPaymentExchange {
            return <- create FlowPaymentExchange(exchangeRate: exchangeRate)
        }
    }

    init() {
        self.totalPayments = 0
        self.FlowPaymentProviderAdminStoragePath = /storage/FlowPaymentProviderAdmin

        self.vault <- FlowToken.createEmptyVault()
        self.account.save(<- create Administrator(), to: self.FlowPaymentProviderAdminStoragePath)

        let admin1 = self.account.borrow<&MintasticMarket.MarketAdmin>(from: MintasticMarket.MintasticMarketAdminStoragePath)!
        admin1.setPaymentRouter(currency: "flow", paymentRouter: <- create FlowPaymentRouter())

        // initialize the exchange rate with zero which indicates that no exchanges can be fulfilled
        // as long as the exchangeRate is not updated
        let admin2 = self.account.borrow<&MintasticCredit.Administrator>(from: MintasticCredit.MintasticCreditAdminStoragePath)!
        admin2.setPaymentExchange(currency: "flow", exchange: <- create FlowPaymentExchange(exchangeRate: 0.0))

        self.minterFactory <- admin2.createMinterFactory()
    }

}
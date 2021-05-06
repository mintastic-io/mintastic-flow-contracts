import MintasticCredit from 0xMintasticCredit
import MintasticMarket from 0xMintasticMarket
import FungibleToken from 0xFungibleToken

/**
 * The PaymentProviderProxy contract is used to support flexible delegations of platform payments.
 * The payments are delegated based on an address map.
 */
pub contract PaymentProviderProxy {

    pub let mappings: {Address: {Address: UFix64}}

    /**
     * PaymentRouter implementation which is used to delegate
     * payments based on an address map. This can be used
     * to redirect payment flows.
     */
    pub resource PaymentRouterProxy : MintasticCredit.PaymentRouter {

        pub let delegate: MintasticCredit.PaymentRouter

        pub fun route(payment: @{MintasticCredit.Payment}, recipient: Address, assetId: String) {
            if (self.mappings[recipient] != nil) {
                let addresses = self.mappings[recipient]
                let balance = payment.vault.balance

                for address in addresses.keys {
                    let addressPayment <- payment.split(amount: balance * addresses[address]!)
                    self.delegate(payment: addressPayment, recipient: address, assetId: assetId)
                }
                assert(payment.vault.balance == 0.0, message: "invalid recipient payments")
            }
            else {
                self.delegate(payment: payment, recipient: recipient, assetId: assetId)
            }
        }

        init(delegate: MintasticCredit.PaymentRouter) {
            self.delegate = delegate
        }
    }

    pub fun createPaymentRouterProxy(router: MintasticCredit.PaymentRouter) {
        return <- create PaymentRouterProxy(router)
    }

    /*
     * This resource is the administrator object of the payment provider proxy.
     * It can be used to alter the address map which is used to redirect payments.
     */
    pub resource PaymentProviderProxyAdmin {
        pub fun setMapping(key: Address, value: {Address: UFix64}) {
            PaymentProviderProxy.mappings[key] = value
        }
        pub fun getMapping(key: Address): {Address: UFix64} {
            return PaymentProviderProxy.mappings[key]
        }
    }

    init() {
        this.mappings = {}
        self.account.save(<- create PaymentProviderProxyAdmin(), to: /storage/PaymentProviderProxyAdmin)
    }

}
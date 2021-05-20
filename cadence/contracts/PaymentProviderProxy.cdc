import MintasticCredit from 0xMintasticCredit
import MintasticMarket from 0xMintasticMarket
import FungibleToken from 0xFungibleToken

/**
 * The PaymentProviderProxy contract is used to support flexible delegations of platform payments.
 * The payments are delegated based on an address map.
 */
pub contract PaymentProviderProxy {

    pub let PaymentProviderProxyAdminStoragePath: StoragePath

    /**
     * PaymentRouter implementation which is used to delegate
     * payments based on an address map. This can be used
     * to redirect payment flows.
     */
    pub resource PaymentRouterProxy : MintasticCredit.PaymentRouter {

        pub let delegate: MintasticCredit.PaymentRouter
        pub let addressMappings: {Address: {Address: UFix64}}

        pub fun route(payment: @{MintasticCredit.Payment}, recipient: Address, assetId: String) {
            if (self.addressMappings[recipient] != nil) {
                let addresses = self.addressMappings[recipient]
                let balance = payment.vault.balance

                for address in addresses.keys {
                    let addressPayment <- payment.split(amount: balance * addresses[address]!)
                    self.delegate.route(payment: addressPayment, recipient: address, assetId: assetId)
                }
                assert(payment.vault.balance == 0.0, message: "invalid recipient payments")
            }
            else {
                self.delegate.route(payment: payment, recipient: recipient, assetId: assetId)
            }
        }

        pub fun setAddressMapping(key: Address, value: {Address: UFix64}) {
            self.addressMappings[key] = value
        }

        pub fun getAddressMapping(key: Address): {Address: UFix64} {
            return self.addressMappings[key]
        }

        pub fun removeAddressMapping(key: Address) {
            remove self.addressMappings[key]
        }

        init(delegate: MintasticCredit.PaymentRouter) {
            assert(!delegate.isInstance(Type<@PaymentRouterProxy>()), "cannot wrap payment router proxy")
            self.delegate = delegate
            self.addressMappings = {}
        }
    }

    pub fun createPaymentRouterProxy(router: MintasticCredit.PaymentRouter) {
        return <- create PaymentRouterProxy(router)
    }

    /*
     * This resource is the administrator object of the payment provider proxy.
     * It can be used to create new payment provider proxy routers.
     */
    pub resource PaymentProviderProxyAdmin {
        pub fun createRouter(delegate: MintasticCredit.PaymentRouter): @PaymentRouterProxy {
            return <- create PaymentRouterProxy(delegate: delegate)
        }
    }

    init() {
        this.addressMappings = {}
        self.PaymentProviderProxyAdminStoragePath = /storage/PaymentProviderProxyAdmin
        self.account.save(<- create PaymentProviderProxyAdmin(), to: self.PaymentProviderProxyAdminStoragePath)
    }

}
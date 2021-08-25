import FungibleToken from 0xFungibleToken

transaction(recipient: Address, amount: UFix64) {

    let flowProvider: &FungibleToken.Vault
    let flowReceiver: &{FungibleToken.Receiver}

    prepare(owner: AuthAccount) {
        let VAULT_PATH    = /storage/flowTokenVault
        let RECEIVER_PATH = /public/flowTokenReceiver

        let ex1 = "could not borrow flow token vault"
        let ex2 = "could not borrow flow token receiver"

        let acc = getAccount(recipient)

        self.flowProvider = owner.borrow<&FungibleToken.Vault>(from: VAULT_PATH) ?? panic(ex1)
        self.flowReceiver = acc.getCapability<&{FungibleToken.Receiver}>(RECEIVER_PATH).borrow() ?? panic(ex2)
    }

    execute {
        let vault <- self.flowProvider.withdraw(amount: amount)
        self.flowReceiver.deposit(from: <- vault)
    }
}
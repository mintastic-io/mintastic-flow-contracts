// This script reads the balance field of an account's FlowToken Balance

import FungibleToken from 0xFungibleToken
import FlowToken from 0x0ae53cb6e3f42a79

pub fun main(account: Address): UFix64 {
    let acct = getAccount(account)
    let vaultRef = acct.getCapability(/public/flowTokenBalance)!.borrow<&FlowToken.Vault{FungibleToken.Balance}>()
        ?? panic("Could not borrow Balance reference to the Vault")

    return vaultRef.balance
}
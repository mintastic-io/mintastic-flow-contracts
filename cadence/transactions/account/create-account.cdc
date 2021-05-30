transaction(pubKey: String) {
    prepare(acct: AuthAccount) {
        let account = AuthAccount(payer: acct)
        account.addPublicKey(pubKey.decodeHex())
    }
}
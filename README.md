![mintastic](https://raw.githubusercontent.com/mintastic-io/mintastic-flow-contracts/master/docs/image/mintastic_logo.png)
All flow cadence contracts used by mintastic


This repository contains all cadence flow contracts as well as script and transaction files.
Furthermore, there are wrappers in the repository, which make the scripts and transactions executable using Typescript.

Tests can be executed with "npm run test" (the flow-emulator needs to be started)

# MintasticNFT
This contract defines the structure and behaviour of mintastic NFT assets. By using the MintasticNFT contract, assets 
can be registered in the AssetRegistry so that NFTs, belonging to that asset can be minted. Assets and NFT tokens can
also be locked by this contract.

flow emulator start
flow project deploy --network=testnet
flow keys generate

## Events
### ContractInitialized
    // This event is emitted after the deployment of the MintasticNFT contract, 
    // indicating the successful initialization.
    pub event ContractInitialized()

### Withdraw
    // Event which gets emitted when NFTs were withdrawn from the nft collection.
    pub event Withdraw(id: UInt64, from: Address?)

### Deposit
    // Event which gets emitted when NFTs were deposited from the nft collection.
    pub event Deposit(id: UInt64, to: Address?)

### Mint
    // Event which gets emitted when a NFT was minted.
    pub event Mint(id: UInt64, assetId: String, to: Address?)

### CollectionDeleted
    // Event which gets emitted when a NFT collection is deleted.
    pub event CollectionDeleted(from: Address?)

## Resources
### TokenDataAware
    // Common interface for the NFT data.
    pub resource interface TokenDataAware

### Composable
    // Common interface for the NFT composability.
    pub resource interface Composable

### NFT
    // This resource represents a specific mintastic NFT which can be minted and transferred. Each NFT belongs to an asset id
    // and has an edition information. In addition to that each NFT can have other NFTs which makes it composable.
    pub resource NFT: NonFungibleToken.INFT, TokenDataAware, Composable

### TokenData
    // The data of a NFT token. The asset id references to the asset in the asset registry 
    // which holds all the information the NFT is about.
    pub struct TokenData

### AssetRegistry
    // This resource is used to register an asset in order to mint NFT tokens of it. 
    // The asset registry manages the supply of the asset and is also able to lock it.
    pub resource AssetRegistry

### Asset
    // This structure defines all the information an asset has. The content attribute is a IPFS link 
    // to a data structure which contains all the data the NFT asset is about.
    // 
    // The series attribute represents a group of NFTs. After a series is locked no more assets can be minted in this series.
    // The type attribute represents the type of asset e.g. image, video and so on.
    pub struct Asset

### Collection
    // This resource is used by an account to collect mintastic NFTs.
    pub resource Collection: CollectionPublic, NonFungibleToken.Provider, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic

### CollectionPublic
    // This is the interface that users can cast their MintasticNFT Collection as to allow others to deposit MintasticNFTs
    // into their Collection. It also allows for reading the details of MintasticNFTs in the Collection.
    pub resource interface CollectionPublic

### NFTMinter
    // This resource is used to mint mintastic NFTs.
    pub resource NFTMinter

# MintasticCredit
The mintastic credit is the internal currency of mintastic. Either fiat payments (off-chain) as well as cryptocurrency 
payments (on-chain) can be realized by transforming the source currency to the mintastic credit target currency.

The MintasticCredit contract supports the exchange of the currencies natively by the use of the PaymentExchange implementations.

## Events
### TokensInitialized
    // This event is emitted after the deployment of the MintasticCredit contract, indicating the successful initialization.
    pub event TokensInitialized(initialSupply: UFix64)

### TokensWithdrawn
    // Event which gets emitted when tokens were withdrawn from the credit vault.
    pub event TokensWithdrawn(amount: UFix64, from: Address?)

### TokensDeposited
    // Event which gets emitted when tokens were deposited to the credit vault.
    pub event TokensDeposited(amount: UFix64, to: Address?)

### TokensMinted
    // This event is emitted after the Minter resources has successfully minted new credits.
    pub event TokensMinted(amount: UFix64)

### TokensBurned
    // This event is emitted after the Minter resources has successfully minted new credits.
    pub event TokensBurned(amount: UFix64)

## Resources
### Vault
    // Standard FungibleToken vault implementation.
    // Mintastic credits have no max supply because mintastic credits were burned after a payment.
    pub resource Vault: FungibleToken.Provider, FungibleToken.Receiver, FungibleToken.Balance

### Administrator
    // The administrator resource can be used to get direct access to the contract internal resources.
    // By the use of this resource tokens can be minted/burned, and the payment exchange functionality can be modified.
    pub resource Administrator

### MinterFactory
    // A minter factory implementation is used by a payment service resource in order to create mintastic credits on the fly.
    pub resource MinterFactory

### Minter
    // By the use of this resource the contract admin is able to mint tokens.
    pub resource Minter

### Burner
    // By the use of this resource the contract admin is able to burn tokens from a token vault.
    pub resource Burner

### Payment
    // The resource interface definition for all payment implementations. A payment resource is used to buy a mintastic asset,
    // and it is created by an PaymentExchange resource.
    pub resource interface Payment

### PaymentExchange
    // A PaymentExchange resource is used to transform a fungible token vault into a Payment instance, 
    // which can be used to buy a mintastic asset.
    pub resource interface PaymentExchange

### PaymentRouter
    // PaymentRouter resources are used to route a payment to a recipient address.
    pub resource interface PaymentRouter

### Bid
    // The bid resource is used to create a bidding for a mintastic asset. If the bid is accepted it is automatically
    // transformed into a payment by using a payment exchange.
    pub resource Bid

### BidRegistry
    // This resource is used to register bids in order to access them during a asset sell activity.
    // Bids registered in this registry can be publicly rejected after the block limit expired.
    pub resource BidRegistry

# MintasticMarket
This contract is used to realize all kind of market sell activities within mintastic. The market supports direct 
payments as well as bids for custom assets. A MintasticCredit is used for all market activities, so a buyer have to 
exchange his source currency in order to buy something.

A market item is a custom asset which is offered by the token holder for sale. These items can either be
already minted (list offering) or can be minted on the fly during the payment process handling (lazy offering).
Lazy offerings are especially useful to rule a time based drop, or an edition based drop with a hard supply cut after the drop.

Each payment is divided into different shares for the platform, creator (royalty) and the owner of the asset.

## Events
### MarketItemAccepted
    // Event which gets emitted after a market item was successfully sold.
    pub event MarketItemAccepted(assetId: String)

### MarketItemInserted
    // Event which gets emitted after a market item was inserted to a market store.
    pub event MarketItemInserted (assetId: String, owner: Address, price: UFix64)

### MarketItemRemoved
    // Event which gets emitted after a market item was removed from a market store.
    pub event MarketItemRemoved (assetId: String, owner: Address)

### MarketItemBidAccepted
    // Event which gets emitted after a market item bid was accepted.
    pub event MarketItemBidAccepted(bidId: UInt64)

### MarketItemBidRejected
    // Event which gets emitted after a market item bid was rejected.
    pub event MarketItemBidRejected(bidId: UInt64)

## Resources
### PublicMarketItem
    // Resource interface which can be used to read public information about a market item.
    pub resource interface PublicMarketItem

### NFTOffering
    // Resource interface for all nft offerings on the mintastic market.
    pub resource interface NFTOffering

### ListOffering
    // A ListOffering is a nft offering based on a list of already minted NFTs.
    // These NFTs were directly handled out of the owners NFT collection.
    pub resource ListOffering: NFTOffering

### LazyOffering
    // A LazyOffering is a nft offering based on a NFT minter resource which means that these NFTs
    // are going to be minted only after a successful sale.
    pub resource LazyOffering: NFTOffering

### MarketItem
    // This resource represents a mintastic asset for sale and can be offered based on a list of already minted NFT tokens
    // or in a lazy manner where NFTs were only minted after a successful sale. A market item holds a collection of bids
    // which can be accepted or rejected by the NFT owner. The price of a market item can be changed, but by doing so
    // all bids will be rejected.
    pub resource MarketItem: PublicMarketItem

### MarketStoreManager
    // This resource interface defines all admin functions of a market store resource.
    pub resource interface MarketStoreManager

### PublicMarketStore
    // This resource interface defines all public functions of a market store resource.
    pub resource interface PublicMarketStore

### MarketStore
    // The MarketStore resource is used to collect all market items for sale.
    // Market items can either be directly bought or can be the target of a bid
    // which needs to be accepted by the owner of the market store in order to
    // successfully finish the market item sale activity.
    pub resource MarketStore : MarketStoreManager, PublicMarketStore

### MarketAdmin
    // This resource is the administrator object of the mintastic market.
    // It can be used to alter the payment mechanisms without redeploying the contract.
    pub resource MarketAdmin

# FiatPaymentProvider
The FiatPaymentProvider contract is used to support platform payments with off-chain fiat currencies.

## Events
### FiatPaid
    // Event which gets emitted after a successful fiat payment transaction.
    pub event FiatPaid(assetId: String, amount: UFix64, currency: String, exchangeRate: UFix64, recipient: Address)

## Resources
### FiatPayment
    // The fiat payment implementation.
    pub resource FiatPayment: MintasticCredit.Payment

### FiatPaymentExchange
    // A payment exchange implementation which creates mintastic credit tokens after a successful off-chain fiat payment.
    // The FiatPaymentExchange has a exchangeRate attribute which is used as the exchange rate between the two currencies.
    pub resource FiatPaymentExchange : MintasticCredit.PaymentExchange

### FiatPaymentRouter
    // PaymentRouter implementation which is used to emit an event which indicates an off-chain payment service to transfer
    // a fiat payment to a recipient. The mintastic credit vault will be destroyed after the routing.
    pub resource FiatPaymentRouter : MintasticCredit.PaymentRouter

# FlowPaymentProvider
The FlowPaymentProvider contract is used to support platform payments with the flow token cryptocurrency.
The contract itself has a flow token vault in order to lock tokens before they get routet to the recipient.

## Events
### FlowPaid
    // The event which is emitted after a successful flow payment transaction
    pub event FlowPaid(assetId: String, amount: UFix64, currency: String, exchangeRate: UFix64, recipient: Address)

## Resources
### FlowPayment
    // The flow payment implementation.
    pub resource FlowPayment: MintasticCredit.Payment

### FlowPaymentExchange
    // A payment exchange implementation which converts flow tokens to mintastic credit tokens. The FlowPaymentExchange has
    // a exchangeRate attribute which is used as the exchange rate between the two currencies.
    pub resource FlowPaymentExchange : MintasticCredit.PaymentExchange

### FlowPaymentRouter
    // PaymentRouter implementation which is used to route an amount of flow tokens to a recipient. The amount of flow tokens
    // are withdrawn from previously locked flow tokens of the contract internal flow-token vault.
    pub resource FlowPaymentRouter : MintasticCredit.PaymentRouter

### Administrator
    // The administrator resource can be used to get direct access to the contract internal flow-token vault.
    // This can be useful to rollback a flow token payment during a transaction rollback scenario.
    pub resource Administrator

## Protocol sequences
Mint colored lines represent on-chain functions.
Violoet colored lines represent off-chain functions.

The Sequence diagram were created with https://sequencediagram.org/

![create-and-mint-nft](https://raw.githubusercontent.com/mintastic-io/mintastic-flow-contracts/master/docs/image/create-and-mint-nft.png)
![sell-list-nft-off-chain](https://raw.githubusercontent.com/mintastic-io/mintastic-flow-contracts/master/docs/image/sell-list-nft-off-chain.png)
![sell-lazy-nft-on-chain](https://raw.githubusercontent.com/mintastic-io/mintastic-flow-contracts/master/docs/image/sell-lazy-nft-on-chain.png)
![owner-accepts-nft-bid-on-chain](https://raw.githubusercontent.com/mintastic-io/mintastic-flow-contracts/master/docs/image/owner-accepts-nft-bid-on-chain.png)
![owner-rejects-nft-bid-off-chain](https://raw.githubusercontent.com/mintastic-io/mintastic-flow-contracts/master/docs/image/owner-rejects-nft-bid-off-chain.png)


## useful links
https://github.com/onflow/flow-js-testing/blob/450e2cdad731d8658ce189d5d3576ae83f6141f7/src/utils/crypto.js#L49
https://github.com/MaxStalker/use-cadence-js-testing/blob/master/src/test/basic.test.js
https://github.com/MaxStalker/flow-pixel-heads/blob/main/src/test/index.test.js

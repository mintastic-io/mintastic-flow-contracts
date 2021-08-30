![mintastic](https://raw.githubusercontent.com/mintastic-io/mintastic-flow-contracts/master/docs/image/mintastic_logo.png)
All flow cadence contracts used by mintastic


This repository contains all cadence flow contracts as well as script and transaction files.
Furthermore, there are wrappers in the repository, which make the scripts and transactions executable using Typescript.

Tests can be executed with "npm run test" (the flow-emulator needs to be started)
flow emulator start
flow keys generate
flow project deploy --network=testnet


# MintasticNFT
This contract defines the structure and behaviour of mintastic NFT assets. By using the MintasticNFT contract, assets 
can be registered in the AssetRegistry so that NFTs, belonging to that asset can be minted. Assets and NFT tokens can
also be locked by this contract.

# MintasticMarket
This contract is used to realize all kind of market sell activities within mintastic. The market supports direct 
payments as well as bids for custom assets. A market item is a custom asset which is offered by the token holder for sale. 
These items can either be already minted (list offering) or can be minted on the fly during the payment process handling 
(lazy offering). Lazy offerings are especially useful to rule a time based drop, or an edition based drop with a hard supply 
cut after the drop.

Each payment is divided into different shares for the platform, creator (royalty) and the owner of the asset.

## Protocol sequences
Mint colored lines represent on-chain functions.
Violet colored lines represent off-chain functions.

The Sequence diagram were created with https://sequencediagram.org/

![create-and-mint-nft](https://raw.githubusercontent.com/mintastic-io/mintastic-flow-contracts/master/docs/image/create-and-mint-nft.png)
![off-chain-payment](https://raw.githubusercontent.com/mintastic-io/mintastic-flow-contracts/master/docs/image/off-chain-payment.png)
![sell-list-nft-off-chain](https://raw.githubusercontent.com/mintastic-io/mintastic-flow-contracts/master/docs/image/sell-list-nft-off-chain.png)
![sell-lazy-nft-off-chain](https://raw.githubusercontent.com/mintastic-io/mintastic-flow-contracts/master/docs/image/sell-lazy-nft-off-chain.png)
![owner-accepts-nft-bid-off-chain](https://raw.githubusercontent.com/mintastic-io/mintastic-flow-contracts/master/docs/image/owner-accepts-nft-bid-on-chain.png)


## useful links
https://github.com/onflow/flow-js-testing/blob/450e2cdad731d8658ce189d5d3576ae83f6141f7/src/utils/crypto.js#L49
https://github.com/MaxStalker/use-cadence-js-testing/blob/master/src/test/basic.test.js
https://github.com/MaxStalker/flow-pixel-heads/blob/main/src/test/index.test.js

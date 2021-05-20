import NonFungibleToken from 0xNonFungibleToken

/**
 * This contract defines the structure and behaviour of mintastic NFT assets.
 * By using the MintasticNFT contract, assets can be registered in the AssetRegistry
 * so that NFTs, belonging to that asset can be minted. Assets and NFT tokens can
 * also be locked by this contract.
 */
pub contract MintasticNFT: NonFungibleToken {

    pub let MintasticNFTPublicPath: PublicPath
    pub let MintasticNFTPrivatePath: PrivatePath
    pub let MintasticNFTStoragePath: StoragePath
    pub let AssetRegistryStoragePath: StoragePath
    pub let NFTMinterStoragePath: StoragePath

    pub event ContractInitialized()
    pub event Withdraw(id: UInt64, from: Address?)
    pub event Deposit(id: UInt64, to: Address?)
    pub event Mint(id: UInt64, assetId: String, to: Address?)
    pub event CollectionDeleted(from: Address?)

    pub var totalSupply:  UInt64
    pub let assets:       {String: Asset}
    pub let lockedSeries: {String: [UInt16]}
    pub let lockedTokens: [UInt64]
    pub let lockedAssets: [String]

    // Common interface for the NFT data.
    pub resource interface TokenDataAware {
        pub let data: TokenData
    }

    // Common interface for the NFT composability.
    pub resource interface Composable {
        pub let items: @{String:{TokenDataAware, NonFungibleToken.INFT}}
    }

    /**
     * This resource represents a specific mintastic NFT which can be
     * minted and transferred. Each NFT belongs to an asset id and has
     * an edition information. In addition to that each NFT can have other
     * NFTs which makes it composable.
     */
    pub resource NFT: NonFungibleToken.INFT, TokenDataAware, Composable {
        pub let id: UInt64
        pub let data: TokenData
        pub let items: @{String:{TokenDataAware, NonFungibleToken.INFT}}

        init(id: UInt64, data: TokenData, items: @{String:{TokenDataAware, NonFungibleToken.INFT}}) {
            self.id = id
            self.data = data
            self.items <- items
        }

        destroy() {
          destroy self.items
        }
    }

    /**
     * The data of a NFT token. The asset id references to the asset in the
     * asset registry which holds all the information the NFT is about.
     */
    pub struct TokenData {
      pub let assetId: String
      pub let edition: UInt16

      init(assetId: String, edition: UInt16) {
        self.assetId = assetId
        self.edition = edition
      }
    }

    /**
     * This resource is used to register an asset in order to mint NFT tokens of it.
     * The asset registry manages the supply of the asset and is also able to lock it.
     */
    pub resource AssetRegistry {

      pub fun store(asset: Asset) {
          pre {
            MintasticNFT.assets[asset.assetId] == nil: "asset id already registered"
            !(MintasticNFT.lockedSeries[asset.creatorId]??[]).contains(asset.series): "series is locked"
          }
          MintasticNFT.assets[asset.assetId] = asset
      }

      pub fun setMaxSupply(assetId: String, supply: UInt16) {
        pre { MintasticNFT.assets[assetId] != nil: "asset not found" }
        MintasticNFT.assets[assetId]!.setMaxSupply(supply: supply)
      }

      pub fun lockToken(tokenId: UInt64) {
          MintasticNFT.lockedTokens.append(tokenId)
      }

      pub fun unlockToken(index: Int) {
          MintasticNFT.lockedTokens.remove(at: index)
      }

      pub fun lockAsset(assetId: String) {
          MintasticNFT.lockedAssets.append(assetId)
      }

      pub fun unlockAsset(index: Int) {
          MintasticNFT.lockedAssets.remove(at: index)
      }

      pub fun lockSeries(creatorId: String, series: UInt16) {
          pre { series > (0 as UInt16): "cannot lock default series 0" }
          if (MintasticNFT.lockedSeries[creatorId] == nil) {
            MintasticNFT.lockedSeries[creatorId] = [series]
          } else {
            MintasticNFT.lockedSeries[creatorId]!.append(series)
          }
      }

    }

    /**
     * This structure defines all the information an asset has. The content
     * attribute is a IPFS link to a data structure which contains all
     * the data the NFT asset is about.
     *
     * The series attribute represents a group of NFTs. After a series is locked
     * no more assets can be minted in this series.
     *
     * The type attribute represents the type of asset e.g. image, video and so on.
     */
    pub struct Asset {
        pub let assetId: String
        pub let creatorId: String
        pub let addresses: {Address:UFix64}
        pub let content: String
        pub let royalty: UFix64
        pub let series: UInt16
        pub let type: UInt16
        pub let supply: Supply

        pub fun setMaxSupply(supply: UInt16) {
            self.supply.setMax(supply: supply)
        }

        pub fun setCurSupply(supply: UInt16) {
            self.supply.setCur(supply: supply)
        }

        init(creatorId: String, assetId: String, content: String, addresses: {Address:UFix64}, royalty: UFix64, series: UInt16, type: UInt16, maxSupply: UInt16) {
            pre {
                royalty <= 0.2: "royalty must be lower than or equal to 0.2"
                addresses.length > 0: "no address found"
            }

            var sum:UFix64 = 0.0
            for value in addresses.values {
                sum = sum + value
            }
            assert(sum == 1.0, message: "invalid address shares")

            self.assetId = assetId
            self.creatorId = creatorId
            self.addresses = addresses
            self.content = content
            self.royalty = royalty
            self.series = series
            self.type = type
            self.supply = Supply(max: maxSupply)
        }
    }

    /**
     * This structure defines all information about the asset supply.
     */
    pub struct Supply {
        pub var max: UInt16
        pub var cur: UInt16

        pub fun setMax(supply: UInt16) {
            pre {
                supply < self.max: "supply must be lower than current max supply"
                supply > self.cur: "supply must be greater than current supply"
            }
            self.max = supply
        }

        pub fun setCur(supply: UInt16) {
            pre {
                supply <= self.max: "max supply limit reached"
                supply > self.cur: "supply must be greater than current supply"
            }
            self.cur = supply
        }

        init(max: UInt16) {
            self.max = max
            self.cur = 0
        }
    }

    /**
     * This resource is used by an account to collect mintastic NFTs.
     */
    pub resource Collection: CollectionPublic, NonFungibleToken.Provider, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic {
        pub var ownedNFTs:   @{UInt64: NonFungibleToken.NFT}
        pub var ownedAssets: {String: {UInt16:UInt64}}

        init () {
            self.ownedNFTs <- {}
            self.ownedAssets = {}
        }

        pub fun withdraw(withdrawID: UInt64): @NonFungibleToken.NFT {
            let token <- (self.ownedNFTs.remove(key: withdrawID) ?? panic("missing NFT")) as! @MintasticNFT.NFT
            self.assertLocking(token: &token as &NFT)
            self.ownedAssets[token.data.assetId]?.remove(key: token.data.edition)
            if (self.ownedAssets[token.data.assetId]?.length == 0) {
                self.ownedAssets.remove(key: token.data.assetId)
            }

            emit Withdraw(id: token.id, from: self.owner?.address)
            return <-token
        }

        pub fun batchWithdraw(ids: [UInt64]): @NonFungibleToken.Collection {
            var batchCollection <- create Collection()
            for id in ids {
                batchCollection.deposit(token: <-self.withdraw(withdrawID: id))
            }
            return <-batchCollection
        }

        pub fun deposit(token: @NonFungibleToken.NFT) {
            let token <- token as! @MintasticNFT.NFT
            let id: UInt64 = token.id

            if (self.ownedAssets[token.data.assetId] == nil) {
                self.ownedAssets[token.data.assetId] = {}
            }
            self.ownedAssets[token.data.assetId]!.insert(key: token.data.edition, token.id)

            self.assertLocking(token: &token as &NFT)

            let oldToken <- self.ownedNFTs[id] <- token
            emit Deposit(id: id, to: self.owner?.address)
            destroy oldToken
        }

        pub fun batchDeposit(tokens: @NonFungibleToken.Collection) {
            for key in tokens.getIDs() {
                self.deposit(token: <-tokens.withdraw(withdrawID: key))
            }
            destroy tokens
        }

        access(contract) fun assertLocking(token: &NFT) {
            if (MintasticNFT.lockedAssets.contains(token.data.assetId)) {
              panic("Asset is locked")
            }
            if (MintasticNFT.lockedTokens.contains(token.id)) {
              panic("Asset is locked")
            }
        }

        pub fun getIDs(): [UInt64] {
            return self.ownedNFTs.keys
        }

        pub fun getAssetIDs(): [String] {
            return self.ownedAssets.keys
        }

        pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT {
            return &self.ownedNFTs[id] as &NonFungibleToken.NFT
        }

        pub fun getTokenIDs(assetId: String): [UInt64] {
            return (self.ownedAssets[assetId] ?? {}).values
        }

        pub fun getEditions(assetId: String): {UInt16:UInt64} {
            return self.ownedAssets[assetId] ?? {}
        }

        pub fun getOwnedAssets(): {String: {UInt16:UInt64}} {
            return self.ownedAssets
        }

        pub fun borrowMintasticNFT(tokenId: UInt64): &MintasticNFT.NFT? {
            if self.ownedNFTs[tokenId] != nil {
                let ref = &self.ownedNFTs[tokenId] as auth &NonFungibleToken.NFT
                return ref as! &MintasticNFT.NFT
            } else {
                return nil
            }
        }

        destroy() {
            destroy self.ownedNFTs
            self.ownedAssets = {}
            emit CollectionDeleted(from: self.owner?.address)
        }
    }

    pub fun createEmptyCollection(): @NonFungibleToken.Collection {
        return <- create Collection()
    }

    // This is the interface that users can cast their MintasticNFT Collection as
    // to allow others to deposit MintasticNFTs into their Collection. It also allows for reading
    // the details of MintasticNFTs in the Collection.
    pub resource interface CollectionPublic {
        pub fun getIDs(): [UInt64]
        pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT
        pub fun getAssetIDs(): [String]
        pub fun deposit(token: @NonFungibleToken.NFT)
        pub fun batchDeposit(tokens: @NonFungibleToken.Collection)
        pub fun getTokenIDs(assetId: String): [UInt64]
        pub fun getEditions(assetId: String): {UInt16:UInt64}
        pub fun getOwnedAssets(): {String: {UInt16:UInt64}}
        pub fun borrowMintasticNFT(tokenId: UInt64): &NFT? {
          post {
            (result == nil) || result?.id == tokenId:
            "Cannot borrow MintasticNFT reference: The ID of the returned reference is incorrect"
          }
        }
    }

    // This resource is used to mint mintastic NFTs.
	pub resource NFTMinter {

		pub fun mint(assetId: String, amount: UInt16): @NonFungibleToken.Collection {
            pre { MintasticNFT.assets[assetId] != nil: "asset not found" }

            let collection <- create Collection()
            let supply = MintasticNFT.assets[assetId]!.supply

            var a:UInt16 = 0
            while a < amount {
                a = a + (1 as UInt16)
                supply.setCur(supply: supply.cur + (1 as UInt16))

                let data = TokenData(assetId: assetId, edition: supply.cur)
			    collection.deposit(token: <- create NFT(id: MintasticNFT.totalSupply, data: data, items: {}))

                emit Mint(id: MintasticNFT.totalSupply, assetId: assetId, to: self.owner?.address)
                MintasticNFT.totalSupply = MintasticNFT.totalSupply + (1 as UInt64)
            }
            MintasticNFT.assets[assetId]!.setCurSupply(supply: supply.cur)

            return <- collection
		}
	}

	init() {
        self.totalSupply  = 0
        self.lockedTokens = []
        self.lockedAssets = []
        self.lockedSeries = {}
        self.assets       = {}

        self.MintasticNFTPublicPath   = /public/MintasticNFTs
        self.MintasticNFTPrivatePath  = /private/MintasticNFTs
        self.MintasticNFTStoragePath  = /storage/MintasticNFTs
        self.AssetRegistryStoragePath = /storage/AssetRegistry
        self.NFTMinterStoragePath     = /storage/NFTMinter

        self.account.save(<- create AssetRegistry(), to: self.AssetRegistryStoragePath)
        self.account.save(<- create NFTMinter(),     to: self.NFTMinterStoragePath)
        self.account.save(<- create Collection(),    to: self.MintasticNFTStoragePath)

        self.account.link<&{NonFungibleToken.Receiver, MintasticNFT.CollectionPublic}>(self.MintasticNFTPublicPath, target: self.MintasticNFTStoragePath)

        emit ContractInitialized()
	}

}
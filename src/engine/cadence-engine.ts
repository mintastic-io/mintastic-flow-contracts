import {Shares} from "../types";
import {Asset} from "../transactions/nft/create-asset";

export interface CadenceEngine {
    execute: <T>(callback: (CadenceEngine) => Promise<T>) => Promise<T>
    getCode: (name: string) => string
    getAuth: (address?: string, keyId?: number) => any
    getListener: () => CadenceListener
}

export interface CadenceListener {
    onCreateAccount: (txId: string, address: string) => Promise<void>
    onSetupCollector: (txId: string, address: string) => Promise<void>
    onSetupCreator: (txId: string, address: string) => Promise<void>
    onTransferFlow: (txId: string, owner: string, recipient: string, amount: string) => Promise<void>
    onAcceptBid: (txId: string, owner: string, assetId: string, bidId: number) => Promise<void>
    onBidWithFiat: (txId: string, owner: string, assetId: string, price: string, amount: number) => Promise<void>
    onBuyWithFiat: (txId: string, owner: string, buyer: string, assetId: string, price: string, amount: number, unlock: boolean, bidId?: number) => Promise<void>
    onCreateLazyOffer: (txId: string, assetId: string, price: string, shares: Shares) => Promise<void>
    onCreateListOffer: (txId: string, owner: string, assetId: string, price: string, shares: Shares) => Promise<void>
    onLockMarketItem: (txId: string, owner: string, assetId: string) => Promise<void>
    onLockOffering: (txId: string, owner: string, assetId: string, amount: number) => Promise<void>
    onRejectBid: (txId: string, owner: string, assetId: string, bidId: number) => Promise<void>
    onRemoveMarketItem: (txId: string, owner: string, assetId: string) => Promise<void>
    onSetItemPrice: (txId: string, owner: string, assetId: string, price: string) => Promise<void>
    onSetMarketFee: (txId: string, key: string, value: string) => Promise<void>
    onUnlockMarketItem: (txId: string, owner: string, assetId: string) => Promise<void>
    onUnlockOffering: (txId: string, owner: string, assetId: string, amount: number) => Promise<void>
    onCreateAsset: (txId: string, asset: Asset, maxSupply: number) => Promise<void>
    onLockSeries: (txId: string, creatorId: string, series: number) => Promise<void>
    onMint: (txId: string, recipient: string, assetId: string, amount: number) => Promise<void>
    onSetMaxSupply: (txId: string, assetId: string, supply: number) => Promise<void>
    onTransfer: (txId: string, owner: string, buyer: string, assetId: string, amount: number) => Promise<void>
}

// noinspection JSUnusedLocalSymbols
export class NoOpCadenceListener implements CadenceListener {
    onAcceptBid = (txId: string, owner: string, assetId: string, bidId: number) => Promise.resolve()
    onBidWithFiat = (txId: string, owner: string, assetId: string, price: string, amount: number) => Promise.resolve()
    onBuyWithFiat = (txId: string, owner: string, buyer: string, assetId: string, price: string, amount: number, unlock: boolean, bidId: number | undefined) => Promise.resolve()
    onCreateAccount = (txId: string, address: string) => Promise.resolve()
    onCreateAsset = (txId: string, asset: Asset, maxSupply: number) => Promise.resolve()
    onCreateLazyOffer = (txId: string, assetId: string, price: string, shares: Shares) => Promise.resolve()
    onCreateListOffer = (txId: string, owner: string, assetId: string, price: string, shares: Shares) => Promise.resolve()
    onLockMarketItem = (txId: string, owner: string, assetId: string) => Promise.resolve()
    onLockOffering = (txId: string, owner: string, assetId: string, amount: number) => Promise.resolve()
    onLockSeries = (txId: string, creatorId: string, series: number) => Promise.resolve()
    onMint = (txId: string, recipient: string, assetId: string, amount: number) => Promise.resolve()
    onRejectBid = (txId: string, owner: string, assetId: string, bidId: number) => Promise.resolve()
    onRemoveMarketItem = (txId: string, owner: string, assetId: string) => Promise.resolve()
    onSetItemPrice = (txId: string, owner: string, assetId: string, price: string) => Promise.resolve()
    onSetMarketFee = (txId: string, key: string, value: string) => Promise.resolve()
    onSetMaxSupply = (txId: string, assetId: string, supply: number) => Promise.resolve()
    onSetupCollector = (txId: string, address: string) => Promise.resolve()
    onSetupCreator = (txId: string, address: string) => Promise.resolve()
    onTransfer = (txId: string, owner: string, buyer: string, assetId: string, amount: number) => Promise.resolve()
    onTransferFlow = (txId: string, owner: string, recipient: string, amount: string) => Promise.resolve()
    onUnlockMarketItem = (txId: string, owner: string, assetId: string) => Promise.resolve()
    onUnlockOffering = (txId: string, owner: string, assetId: string, amount: number) => Promise.resolve()
}
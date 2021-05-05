import {v4 as uuid} from "uuid"
import {Asset} from "../../src/transactions/nft/create-asset";

export function newAsset(creatorId: string = uuid(), assetId: string = uuid(), address:string, series: number = 0, royalty: string = "0.1", type: number = 0, content: string = "content"): Asset {
    const addresses: {address:string, share:string}[] = [{address, share: "1.0"}]
    return { creatorId, assetId, content, addresses, royalty, series, type }
}
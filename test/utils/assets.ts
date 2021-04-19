import {v4 as uuid} from "uuid"

export function newAsset(creatorId: string = uuid(), assetId: string = uuid(), address:string, series: number = 0, royalty: string = "0.1", type: number = 0, content: string = "content") {
    return { creatorId, assetId, content, address, royalty, series, type }
}
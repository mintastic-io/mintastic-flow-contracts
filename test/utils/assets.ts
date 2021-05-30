import {v4 as uuid} from "uuid"
import {Asset} from "../../src/transactions/nft/create-asset";

export function newAsset(creatorId: string = uuid(), assetId: string = uuid(), series: number = 0, royalty: string = "0.1", type: number = 0, content: string = "content"): Asset {
    const creators: { creatorId: string, share: string }[] = [{creatorId, share: "1.0"}]
    return {creators, assetId, content, royalty, series, type}
}

export function newTeamAsset(assetId: string = uuid(),
                             creators: { creatorId: string, share: string }[],
                             series: number = 0, royalty: string = "0.1", type: number = 0, content: string = "content"): Asset {
    return {creators, assetId, content, royalty, series, type}
}
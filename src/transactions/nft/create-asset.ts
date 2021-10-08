import * as fcl from "@onflow/fcl"
import * as t from "@onflow/types"
import {CadenceEngine} from "../../engine/cadence-engine";

/**
 * This transaction is used to create an asset in order to mint tokens.
 * After the creation the asset is ready to be minted or to be purchased in a lazy manner.
 *
 * @param asset the asset to create
 * @param maxSupply the max supply of the asset
 */
export function createAsset(asset: Asset, maxSupply: number): (CadenceEngine) => Promise<Asset> {
    if (asset === undefined || asset === null)
        throw Error("asset is must not be null");
    if (asset.assetId === undefined || asset.assetId === null)
        throw Error("asset.assetId must not be null");
    if (asset.royalty === undefined || asset.royalty === null)
        throw Error("asset.royalty must not be null");
    if (asset.type === undefined || asset.type === null)
        throw Error("asset.type must not be null");
    if (asset.content === undefined || asset.content === null)
        throw Error("asset.content must not be null");
    if (asset.series === undefined || asset.series === null)
        throw Error("asset.series must not be null");
    if (asset.creators === undefined || asset.creators === null)
        throw Error("asset.creators must not be null");
    if (maxSupply <= 0)
        throw Error("the max supply must be greater than zero")

    return (engine: CadenceEngine) => {
        const auth = engine.getAuth();
        const code = engine.getCode("transactions/nft/create-asset");

        return fcl.send([
            fcl.transaction`${code}`,
            fcl.payer(auth),
            fcl.proposer(auth),
            fcl.authorizations([auth]),
            fcl.limit(100),
            fcl.args([
                fcl.arg(
                    asset.creators.map(e => ({key: e.creatorId, value: e.share})),
                    t.Dictionary({key: t.String, value: t.UFix64})
                ),
                fcl.arg(asset.assetId, t.String),
                fcl.arg(asset.content, t.String),
                fcl.arg(asset.royalty, t.UFix64),
                fcl.arg(asset.series || 0, t.UInt16),
                fcl.arg(asset.type, t.UInt16),
                fcl.arg(maxSupply, t.UInt16),
            ])
        ])
            .then(fcl.decode)
            .then(txId => fcl.tx(txId).onceSealed().then(_ => {
                return engine.getListener().onCreateAsset(txId, asset, maxSupply).then(_ => asset);
            }))
    }
}

export interface Asset {
    assetId: string
    creators: { creatorId: string, share: string }[]
    content: string
    royalty: string
    series: number
    type: number
}
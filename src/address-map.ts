import {config} from "@onflow/config"
import * as fcl from "@onflow/fcl"

export class AddressMap {

    readonly mapping: {};

    constructor(mapping: {}) {
        this.mapping = mapping;
    }

    public static fromConfig(): Promise<AddressMap> {
        const promise1 = config().get("0xMintasticNFT");
        const promise2 = config().get("0xNonFungibleToken");
        const promise3 = config().get("0xFungibleToken");
        const promise4 = config().get("0xMintasticCredit");
        const promise5 = config().get("0xMintasticMarket");

        return Promise.all([promise1, promise2, promise3, promise4, promise5])
            .then(values => {
                return {
                    "0xMintasticNFT": values[0],
                    "0xNonFungibleToken": values[1],
                    "0xFungibleToken": values[2],
                    "0xMintasticCredit": values[3],
                    "0xMintasticMarket": values[4]
                }
            })
            .then(e => new AddressMap(e));
    }

    public apply(code: string): string {
        Object.keys(this.mapping).forEach(k => {
            code = code.replace(k, fcl.withPrefix(this.mapping[k]));
        });
        return code;
    }

    public applyAll(codeMap) {
        Object.keys(codeMap).forEach(k => {
            codeMap[k] = this.apply(codeMap[k]);
        })
        return codeMap;
    }

}
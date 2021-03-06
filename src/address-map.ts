import {config} from "@onflow/config"
import * as fcl from "@onflow/fcl"

export class AddressMap {

    readonly mapping: AddressMapping;

    constructor(mapping: AddressMapping) {
        this.mapping = mapping;
    }

    public static fromConfig(): Promise<AddressMap> {
        const promise1 = config().get("0xMintasticNFT");
        const promise2 = config().get("0xNonFungibleToken");
        const promise3 = config().get("0xFungibleToken");
        const promise4 = config().get("0xMintasticMarket");

        return Promise.all([promise1, promise2, promise3, promise4])
            .then(values => {
                return {
                    "0xMintasticNFT": values[0],
                    "0xNonFungibleToken": values[1],
                    "0xFungibleToken": values[2],
                    "0xMintasticMarket": values[3]
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

interface AddressMapping {
    "0xMintasticNFT": string
    "0xNonFungibleToken": string
    "0xFungibleToken": string
    "0xMintasticMarket":string
}
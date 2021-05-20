import {CadenceEngine} from "./cadence-engine";
import * as fcl from "@onflow/fcl"
import {AddressMap} from "../address-map";

export class WebCadenceEngine implements CadenceEngine {

    private readonly codeMap = {}

    constructor(codeMap: {}, addressMap: AddressMap) {
        Object.keys(codeMap).forEach(key => {
            this.codeMap[key] = addressMap.apply(codeMap[key]);
        })
    }

    public execute<T>(callback: (CadenceEngine) => Promise<T>): Promise<T> {
        return callback(this);
    }

    public getCode(name: string) {
        if (name in this.codeMap)
            return this.codeMap[name];
        throw new Error(`no code with name '${name}' found.`);
    }

    public getAuth() {
        return fcl.authz;
    }

}
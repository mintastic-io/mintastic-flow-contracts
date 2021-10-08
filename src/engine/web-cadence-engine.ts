import {CadenceEngine, CadenceListener, NoOpCadenceListener} from "./cadence-engine";
import * as fcl from "@onflow/fcl"
import {AddressMap} from "../address-map";

export class WebCadenceEngine implements CadenceEngine {

    private readonly codeMap = {}
    private readonly listener: CadenceListener

    constructor(codeMap: {}, addressMap: AddressMap, listener: CadenceListener = new NoOpCadenceListener()) {
        Object.keys(codeMap).forEach(key => {
            this.codeMap[key] = addressMap.apply(codeMap[key]);
        })
        this.listener = listener;
    }

    public execute<T>(callback: (CadenceEngine) => Promise<T>): Promise<T> {
        return callback(this);
    }

    public getCode(name: string) {
        if (name in this.codeMap)
            return this.codeMap[name];
        throw new Error(`no code with name '${name}' found.`);
    }

    getAuth = () => fcl.authz;
    getListener = () => this.listener

}
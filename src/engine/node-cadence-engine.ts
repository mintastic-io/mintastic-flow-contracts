import {config} from "@onflow/config"
import * as fcl from "@onflow/fcl"
import {ec as EC} from "elliptic";
import {SHA3} from "sha3";
import path from "path";
import {CadenceEngine} from "./cadence-engine";
import {AddressMap} from "../address-map";

export class NodeCadenceEngine implements CadenceEngine{

    private readonly ec: EC = new EC("p256");
    private readonly addressMap: AddressMap;
    private readonly codeCache = {}
    private readonly signer: string;
    private readonly keyId: number;

    constructor(signer: string, keyId:number = 0, addressMap: AddressMap) {
        this.addressMap = addressMap;
        this.signer = signer;
        this.keyId = keyId;
    }

    public execute<T>(callback: (CadenceEngine) => Promise<T>): Promise<T> {
        return callback(this);
    }

    public getCode(name: string) {
        if (name in this.codeCache)
            return this.codeCache[name];

        const code_path = `../../cadence/${name}.cdc`;
        const fs = require("fs");
        let code = this.addressMap.apply(fs.readFileSync(path.join(__dirname, code_path), "utf8"));

        this.codeCache[name] = code;
        return code;
    }

    public getAuth(address?: string, keyId?: number) {
        return async (account: any = {}) => {
            const user = await this.getAccount(address || this.signer);

            let sequenceNum;
            if (account.role.proposer) {
                sequenceNum = await this.getSeqNum(address || this.signer, keyId || this.keyId);
                if (sequenceNum === null) {
                    throw new Error("Could not figure out sequence number for authorization with role proposer")
                }
            }
            const signingFunction = async (data) => {
                return {
                    addr: user.address,
                    keyId: this.keyId,
                    signature: this.signWithKey(await config().get("PRIVATE_KEY"), data.message),
                };
            };
            return {
                ...account,
                addr: user.address,
                keyId: this.keyId,
                sequenceNum,
                signature: account.signature || null,
                signingFunction,
                resolve: null,
                roles: account.roles,
            };
        };
    }

    private signWithKey = (privateKey: string, msg: string) => {
        if (privateKey === undefined) throw Error("private key must not be null")

        const key = this.ec.keyFromPrivate(Buffer.from(privateKey, "hex"));
        const sig = key.sign(this.hashMsg(msg));
        const n = 32;
        const r = sig.r.toArrayLike(Buffer, "be", n);
        const s = sig.s.toArrayLike(Buffer, "be", n);
        return Buffer.concat([r, s]).toString("hex");
    }

    private hashMsg = (msg: string) => {
        const sha = new SHA3(256);
        sha.update(Buffer.from(msg, "hex"));
        return sha.digest();
    }

    private async getAccount(addr: string) {
        const {account} = await fcl.send([fcl.getAccount(addr)]);
        return account;
    }

    private async getSeqNum(addr, keyId = 0) {
        const response = await fcl.send([fcl.getAccount(addr.replace(/^0x/, ""))]);
        const account = await fcl.decode(response);
        return account.keys[keyId].sequenceNumber;
    };

}
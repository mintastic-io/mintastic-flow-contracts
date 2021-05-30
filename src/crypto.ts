import {config} from "@onflow/config"
import * as rlp from "rlp";
import {ec as EC} from "elliptic";

export async function pubFlowKey() {
    const privateKey = await config().get("PRIVATE_KEY");

    const ec = new EC("p256")

    const keys = ec.keyFromPrivate(Buffer.from(privateKey, "hex"));
    const publicKey = keys.getPublic("hex").replace(/^04/, "");
    return rlp
        .encode([
            Buffer.from(publicKey, "hex"), // publicKey hex to binary
            2, // P256 per https://github.com/onflow/flow/blob/master/docs/accounts-and-keys.md#supported-signature--hash-algorithms
            3, // SHA3-256 per https://github.com/onflow/flow/blob/master/docs/accounts-and-keys.md#supported-signature--hash-algorithms
            1000, // give key full weight
        ])
        .toString("hex");
}
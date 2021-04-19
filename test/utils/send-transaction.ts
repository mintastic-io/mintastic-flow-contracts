import {getTransactionCode, sendTransaction as sendFlowTransaction,} from "flow-js-testing/dist";

export default async function sendTransaction(name: string, signers: string[], addressMap: {} = {}, args?) {
    let code = await getTransactionCode({name, addressMap});
    return sendFlowTransaction({code, signers, args});
}


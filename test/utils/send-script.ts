import {executeScript, getScriptCode} from "flow-js-testing/dist";

export default async function sendScript(name: string, addressMap: {} = {}, args?) {
    let code = await getScriptCode({name, addressMap});
    return executeScript({code, args});
}


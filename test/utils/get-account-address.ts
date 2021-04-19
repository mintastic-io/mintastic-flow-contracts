import {getAccountAddress as getFlowAccountAddress} from "flow-js-testing/dist";

export default async function getAccountAddress(name: string) {
    const address = await getFlowAccountAddress(name);
    expect(address).not.toBe(undefined);
    return address;
}
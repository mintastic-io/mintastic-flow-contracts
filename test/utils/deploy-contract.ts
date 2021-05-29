import {deployContractByName, getContractAddress} from "flow-js-testing";

export default async function deployContract(name: string, to: string, addressMap: {} = {}) {
    if (await getContractAddress(name)) {
        console.log(`contract with name "${name}" already deployed at "${await getContractAddress(name)}".`)
        return
    }

    const deployedContract = await deployContractByName({name, to, addressMap});
    expect(deployedContract.status).toBe(4);

    return deployedContract;
}


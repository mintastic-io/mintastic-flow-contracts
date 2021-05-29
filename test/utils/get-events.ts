import * as fcl from "@onflow/fcl";
import getAccountAddress from "./get-account-address";

export async function getEvents(contract: string, eventName: string, blockHeight: number = 0) {
    const mintastic = await getAccountAddress("Mintastic");
    const fullEventName = `A.${fcl.sansPrefix(mintastic)}.${contract}.${eventName}`

    let latestBlock = await getLatestBlock();
    const fromBlock = blockHeight;
    const toBlock = blockHeight + latestBlock.height;

    const result = await fcl.send([
        fcl.getEventsAtBlockHeightRange(fullEventName, fromBlock, toBlock),
    ]);
    return await fcl.decode(result);
}

export async function getLatestBlock() {
    const block = await fcl.send([fcl.getBlock(true)]);
    const decoded = await fcl.decode(block);
    return decoded;
}
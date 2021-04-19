import {getEvents as getFlowEvents} from "@onflow/sdk-build-get-events";
import {latestBlock as getLatestBlock} from "@onflow/sdk-latest-block";
import * as fcl from "@onflow/fcl";
import {send} from "@onflow/sdk-send";
import getAccountAddress from "./get-account-address";

export async function getEvents(contract: string, eventName: string, blockHeight: number = 0) {
    const mintastic = await getAccountAddress("Mintastic");
    const fullEventName = `A.${fcl.sansPrefix(mintastic)}.${contract}.${eventName}`

    let latestBlock = await getLatestBlock();
    const fromBlock = blockHeight;
    const toBlock = blockHeight + latestBlock.height;

    const getEventsResult = await send([getFlowEvents(fullEventName, fromBlock, toBlock)]);
    return await fcl.decode(getEventsResult);
}
import {config} from "@onflow/config"
import getAccountAddress from "./get-account-address";
import {AddressMap, NodeCadenceEngine, setMarketFee, setupCollector, setupCreator} from "../../src";
import deployContract from "./deploy-contract";
import * as fcl from "@onflow/fcl";
import {mintFlow} from "../../src/transactions/flow/mint-flow";

export async function setupEnv(): Promise<TestEnv> {
    config()
        .put("SERVICE_ADDRESS", "0xf8d6e0586b0a20c7")
        .put("PRIVATE_KEY", "11c5dfdeb0ff03a7a73ef39788563b62c89adea67bbb21ab95e5f710bd1d40b7")

    const mintastic = await getAccountAddress("Mintastic");
    const alice = await getAccountAddress("Alice");
    const bob = await getAccountAddress("Bob");
    const carol = await getAccountAddress("Carol");
    const dan = await getAccountAddress("Dan");

    config()
        .put("0xNonFungibleToken", mintastic)
        .put("0xMintasticNFT", mintastic)
        .put("0xFungibleToken", "0xee82856bf20e2aa6")
        .put("0xMintasticMarket", mintastic)
        .put("0xFlowToken", "0x0ae53cb6e3f42a79") // https://docs.onflow.org/core-contracts/flow-token/

    const engine = new NodeCadenceEngine(mintastic, 0, await AddressMap.fromConfig());

    await engine.execute(mintFlow(mintastic, "1000.0"))
    await engine.execute(mintFlow(alice, "1000.0"))
    await engine.execute(mintFlow(bob, "1000.0"))

    const addressMap = {
        "NonFungibleToken": mintastic,
        "MintasticNFT": mintastic,
        "FungibleToken": "0xee82856bf20e2aa6",
        "MintasticMarket": mintastic,
        "FlowToken": "0x0ae53cb6e3f42a79",
    }

    // deploy the contracts
    await deployContract("NonFungibleToken", mintastic);
    await deployContract("FungibleToken", mintastic);
    await deployContract("MintasticNFT", mintastic, addressMap);
    await deployContract("MintasticMarket", mintastic, addressMap);

    await engine.execute(setupCreator(alice));
    await engine.execute(setupCollector(alice));
    await engine.execute(setupCollector(bob));

    await engine.execute(setMarketFee("10000.0", "0.1"))
    const blockHeight = await getBlockHeight();

    return {engine, mintastic, alice, bob, carol, dan, blockHeight}
}

export async function getEnv(): Promise<TestEnv> {
    const mintastic = await getAccountAddress("Mintastic");
    const alice = await getAccountAddress("Alice");
    const bob = await getAccountAddress("Bob");
    const carol = await getAccountAddress("Carol");
    const dan = await getAccountAddress("Dan");
    const engine = new NodeCadenceEngine(mintastic, 0, await AddressMap.fromConfig());
    const blockHeight = await getBlockHeight();

    return {engine, mintastic, alice, bob, carol, dan, blockHeight}
}

export async function getBlockHeight() {
    const block = await fcl.send([fcl.getBlock(true)]);
    const decoded = await fcl.decode(block);
    return decoded.height;
}

export interface TestEnv {
    engine: NodeCadenceEngine
    mintastic: string
    alice: string
    bob: string
    carol: string
    dan: string
    blockHeight: number
}
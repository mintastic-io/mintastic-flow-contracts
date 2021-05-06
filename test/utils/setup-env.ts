import {config} from "@onflow/config"
import getAccountAddress from "./get-account-address";
import {AddressMap, NodeCadenceEngine, setupCollector} from "../../src";
import deployContract from "./deploy-contract";
import {setupCreator} from "../../src/transactions/account/setup-creator";
import {setBlockLimit} from "../../src/transactions/market/set-block-limit";
import {setExchangeRate} from "../../src/transactions/credit/set-exchange-rate";
import {setMarketFee} from "../../src/transactions/market/set-market-fee";
import {latestBlock as getLatestBlock} from "@onflow/sdk-latest-block";

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
        .put("0xMintasticCredit", mintastic)
        .put("0xMintasticMarket", mintastic)
        .put("0xFlowToken", "0x0ae53cb6e3f42a79") // https://docs.onflow.org/core-contracts/flow-token/
        .put("0xFlowPaymentProvider", mintastic)
        .put("0xFiatPaymentProvider", mintastic)

    const engine = new NodeCadenceEngine(mintastic, 0, await AddressMap.fromConfig());

    const addressMap = {
        "NonFungibleToken": mintastic,
        "MintasticNFT": mintastic,
        "FungibleToken": "0xee82856bf20e2aa6",
        "MintasticCredit": mintastic,
        "MintasticMarket": mintastic,
        "FlowToken": "0x0ae53cb6e3f42a79",
        "FlowPaymentProvider": mintastic,
        "FiatPaymentProvider": mintastic
    }

    // deploy the contracts
    await deployContract("NonFungibleToken", mintastic);
    await deployContract("FungibleToken", mintastic);
    await deployContract("MintasticNFT", mintastic, addressMap);
    await deployContract("MintasticCredit", mintastic, addressMap);
    await deployContract("MintasticMarket", mintastic, addressMap);
    await deployContract("FiatPaymentProvider", mintastic, addressMap);
    await deployContract("FlowPaymentProvider", mintastic, addressMap);

    await engine.execute(setupCreator(alice));
    await engine.execute(setupCollector(alice));
    await engine.execute(setupCollector(bob));

    await engine.execute(setBlockLimit(25));
    await engine.execute(setExchangeRate("flow", "25.0"));
    await engine.execute(setMarketFee("10000.0", "0.1"))

    const blockHeight = await getLatestBlock().height

    return {engine, mintastic, alice, bob, carol, dan, blockHeight}
}

export async function getEnv(): Promise<TestEnv> {
    const mintastic = await getAccountAddress("Mintastic");
    const alice = await getAccountAddress("Alice");
    const bob = await getAccountAddress("Bob");
    const carol = await getAccountAddress("Carol");
    const dan = await getAccountAddress("Dan");
    const engine = new NodeCadenceEngine(mintastic, 0, await AddressMap.fromConfig());
    const blockHeight = (await getLatestBlock()).height

    return {engine, mintastic, alice, bob, carol, dan, blockHeight}
}

export async function getBlock() {
    return getLatestBlock().then(e => e.height)
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
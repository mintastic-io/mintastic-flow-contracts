import path from "path";
import {init} from "flow-js-testing/dist/utils/init";
import {createAsset, createLazyOffer, mint, setupCollector, setupCreator} from "../src";
import {getEnv, setupEnv} from "./utils/setup-env";
import {hasCreatorCollection} from "../src/scripts/account/has-creator-collection";
import getAccountAddress from "./utils/get-account-address";
import {destroyCreator} from "../src/transactions/account/destroy-creator";
import {newAsset} from "./utils/assets";
import {v4 as uuid} from "uuid";
import {getEvents} from "./utils/get-events";
import {storeCreator} from "../src/transactions/nft/store-creator";
import {createAccount} from "../src/transactions/account/create-account";

const getUuid = require('uuid-by-string');

describe("mintastic contract test suite", function () {
    beforeAll(async () => {
        jest.setTimeout(10000);
        init(path.resolve(__dirname, "../cadence"));
        await setupEnv()
    });

    test("mint a NFT from a mintable", async () => {
        const {engine} = await getEnv()
        const account = await getAccountAddress("Test-")

        await engine.execute(setupCreator(account));
        expect(await engine.execute(hasCreatorCollection(account))).toBeTruthy();

        await engine.execute(destroyCreator(account));
        console.log(await engine.execute(hasCreatorCollection(account)))
    });

    test("buy NFT (off-chain, list offer)", async () => {
        const {engine, alice, blockHeight, mintastic} = await getEnv()
        await engine.execute(storeCreator(getUuid(alice), alice))
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));

        // create a list offering
        await engine.execute(mint(alice, asset.assetId!, 10));
        await engine.execute(createLazyOffer(alice, asset.assetId!, "1000.0"))

        console.log(mintastic)

        console.log(await getEvents("MintasticMarket", "MarketItemInserted", blockHeight))
    });

    test("create account", async () => {
        const {engine} = await getEnv();
        const account = await engine.execute(createAccount());

        expect(account).not.toBeUndefined()

        await engine.execute(setupCollector(account));
        await engine.execute(storeCreator(getUuid(account), account))

        const asset = await engine.execute(createAsset(newAsset(getUuid(account), uuid()), 10));
        await engine.execute(mint(account, asset.assetId!, 10));
    });

})
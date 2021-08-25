import path from "path";
import {init} from "flow-js-testing/dist/utils/init";
import {createAccount, createAsset, createLazyOffer, mint, setupCollector, setupCreator} from "../src";
import {getEnv, setupEnv} from "./utils/setup-env";
import {hasCreatorCollection} from "../src/scripts/account/has-creator-collection";
import getAccountAddress from "./utils/get-account-address";
import {newAsset} from "./utils/assets";
import {v4 as uuid} from "uuid";
import {getEvents} from "./utils/get-events";

const getUuid = require('uuid-by-string');

describe("mintastic contract test suite", function () {
    beforeAll(async () => {
        jest.setTimeout(30000);
        init(path.resolve(__dirname, "../cadence"));
        await setupEnv()
    });

    test("mint a NFT from a mintable", async () => {
        const {engine} = await getEnv()
        const account = await getAccountAddress("Test-")

        await engine.execute(setupCreator(account));
        expect(await engine.execute(hasCreatorCollection(account))).toBeTruthy();
    });

    test("buy NFT (off-chain, list offer)", async () => {
        const {engine, alice, blockHeight} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));

        // create a list offering
        await engine.execute(mint(alice, asset.assetId!, 10));
        const shares = [{creatorId: getUuid(alice) as string, share: "1.0"}]
        await engine.execute(createLazyOffer(asset.assetId!, "1000.0", shares))

        expect((await getEvents("MintasticMarket", "MarketItemInserted", blockHeight)).length).toBe(1)
    });

    test("create account", async () => {
        const {engine} = await getEnv();
        const account = await engine.execute(createAccount());

        expect(account).not.toBeUndefined()
        await engine.execute(setupCollector(account));

        const asset = await engine.execute(createAsset(newAsset(getUuid(account), uuid()), 10));
        await engine.execute(mint(account, asset.assetId!, 10));
    });

})
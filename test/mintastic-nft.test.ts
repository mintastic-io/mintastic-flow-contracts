import path from "path";
import {init} from "flow-js-testing/dist/utils/init";
import {
    createAsset,
    hasCollectorCollection,
    mint,
    readAllAssetIds,
    readCollectorAssetIds,
    setupCollector
} from "../src";
import {v4 as uuid} from "uuid"
import {lockSeries} from "../src/transactions/nft/lock-series";
import {newAsset} from "./utils/assets";
import {readNextSeries} from "../src/scripts/nft/read-next-series";
import {setMaxSupply} from "../src/transactions/nft/set-max-supply";
import {getEnv, setupEnv} from "./utils/setup-env";

const CREATOR_ID = uuid();

describe("mintastic contract test suite", function () {
    beforeAll(async () => {
        jest.setTimeout(10000);
        init(path.resolve(__dirname, "../cadence"));
        await setupEnv()
    });

    test("mint a NFT from a mintable", async () => {
        const {engine, alice, bob} = await getEnv()

        // setup accounts
        await engine.execute(setupCollector(bob));
        expect(await engine.execute(hasCollectorCollection(bob))).toBeTruthy();

        const asset = await engine.execute(createAsset(newAsset(uuid(), uuid(), alice), 10));
        expect((await engine.execute(readAllAssetIds())).length > 0).toBeTruthy();

        await engine.execute(mint(bob, asset.assetId!, 1));

        expect((await engine.execute(readCollectorAssetIds(bob))).length > 0).toBeTruthy();
    });

    test("cannot lock default series", async () => {
        const {engine} = await getEnv()
        await expect(engine.execute(lockSeries(CREATOR_ID, 0))).rejects.toContain("cannot lock default series");
    });

    test("test series locking", async () => {
        const {engine, alice} = await getEnv()
        const series = await (engine.execute(readNextSeries(CREATOR_ID)))

        await engine.execute(createAsset(newAsset(CREATOR_ID, uuid(), alice, series), 10));
        await engine.execute(lockSeries(CREATOR_ID, series));
        await expect(engine.execute(createAsset(newAsset(CREATOR_ID, uuid(), alice, series), 10))).rejects.toContain("series is locked")
    });

    test("cannot create asset twice", async () => {
        const {engine, alice} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(CREATOR_ID, uuid(), alice), 10));
        await expect(engine.execute(createAsset(newAsset(CREATOR_ID, asset.assetId!, alice), 10))).rejects.toContain("asset id already registered");
    });

    test("cannot increase max supply", async () => {
        const {engine, alice} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(CREATOR_ID, uuid(), alice), 10));
        await engine.execute(setMaxSupply(asset.assetId!, 5));
        await expect(engine.execute(setMaxSupply(asset.assetId!, 7))).rejects.toContain("supply must be lower than current max supply");
    });

    test("cannot set max supply lower than cur supply", async () => {
        const {engine, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(CREATOR_ID, uuid(), alice), 10));
        await engine.execute(mint(bob, asset.assetId!, 5));
        await expect(engine.execute(setMaxSupply(asset.assetId!, 3))).rejects.toContain("supply must be greater than current supply");
    });

    test("cannot mint unknown asset", async () => {
        const {engine, bob} = await getEnv()
        await expect(engine.execute(mint(bob, uuid(), 5))).rejects.toContain("asset not found");
    });

    test("cannot mint more then max supply", async () => {
        const {engine, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(CREATOR_ID, uuid(), alice), 10));
        await engine.execute(mint(bob, asset.assetId!, 7));
        await expect(engine.execute(mint(bob, asset.assetId!, 7))).rejects.toContain("max supply limit reached");
    });
})
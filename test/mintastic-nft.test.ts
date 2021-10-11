import path from "path";
import {init} from "flow-js-testing";
import {
    createAsset,
    hasCollectorCollection,
    lockSeries,
    mint,
    readAllAssetIds,
    readCollectorAssetIds,
    setMaxSupply,
    setupCollector
} from "../src";
import {v4 as uuid} from "uuid"
import {newAsset} from "./utils/assets";
import {readNextSeries} from "../src/scripts/nft/read-next-series";
import {getEnv, setupEnv} from "./utils/setup-env";
import {readSupply} from "../src/scripts/nft/read-supply";
import {readOwnedAssets} from "../src/scripts/nft/read-owned-assets";

const getUuid = require('uuid-by-string')

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

        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));
        expect((await engine.execute(readAllAssetIds())).length > 0).toBeTruthy();

        await engine.execute(mint(bob, asset.assetId!, 1));

        expect((await engine.execute(readCollectorAssetIds(bob))).length > 0).toBeTruthy();
    });

    test("cannot lock default series", async () => {
        const {engine} = await getEnv()
        await expect(engine.execute(lockSeries(uuid(), 0))).rejects.toContain("cannot lock default series");
    });

    test("test series locking", async () => {
        const {engine, alice} = await getEnv()
        const series = await (engine.execute(readNextSeries(getUuid(alice))))

        await engine.execute(createAsset(newAsset(getUuid(alice), uuid(), series), 10));
        await engine.execute(lockSeries(getUuid(alice), series));
        await expect(engine.execute(createAsset(newAsset(getUuid(alice), uuid(), series), 10))).rejects.toContain("series is locked")
    });

    test("cannot create asset twice", async () => {
        const {engine, alice} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));
        await expect(engine.execute(createAsset(newAsset(getUuid(alice), asset.assetId!), 10))).rejects.toContain("asset id already registered");
    });

    test("cannot increase max supply", async () => {
        const {engine, alice} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));
        await engine.execute(setMaxSupply(asset.assetId!, 5));
        await expect(engine.execute(setMaxSupply(asset.assetId!, 7))).rejects.toContain("supply must be lower or equal than current max supply");
    });

    test("cannot set max supply lower than cur supply", async () => {
        const {engine, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));
        await engine.execute(mint(bob, asset.assetId!, 5));
        await expect(engine.execute(setMaxSupply(asset.assetId!, 3))).rejects.toContain("supply must be greater or equal than current supply");
    });

    test("lower max supply", async () => {
        const {engine, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));
        await engine.execute(mint(bob, asset.assetId!, 5));
        await engine.execute(setMaxSupply(asset.assetId!, 7));

        const {maxSupply, curSupply} = await engine.execute(readSupply(asset.assetId));
        expect(maxSupply).toBe(7);
        expect(curSupply).toBe(5);
    });

    test("set max supply to cur supply", async () => {
        const {engine, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));
        await engine.execute(mint(bob, asset.assetId!, 5));
        await engine.execute(setMaxSupply(asset.assetId!, 5));

        const {maxSupply, curSupply} = await engine.execute(readSupply(asset.assetId));
        expect(maxSupply).toBe(5);
        expect(curSupply).toBe(5);
    });

    test("cannot mint unknown asset", async () => {
        const {engine, bob} = await getEnv()
        await expect(engine.execute(mint(bob, uuid(), 5))).rejects.toContain("asset not found");
    });

    test("cannot mint more then max supply", async () => {
        const {engine, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));
        await engine.execute(mint(bob, asset.assetId!, 7));
        await expect(engine.execute(mint(bob, asset.assetId!, 7))).rejects.toContain("max supply limit reached");
    });

    test("read assets", async () => {
        const {engine, alice} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));
        await engine.execute(mint(alice, asset.assetId!, 2));
        await engine.execute(mint(alice, asset.assetId!, 5));

        const asset2 = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));
        await engine.execute(mint(alice, asset2.assetId!, 2));
        await engine.execute(mint(alice, asset2.assetId!, 5));

        console.log(await engine.execute(readOwnedAssets(alice)))
    });

    test("read supply", async () => {
        const {engine, alice} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));

        const supplies1 = await engine.execute(readSupply(asset.assetId))
        expect(supplies1.maxSupply).toBe(10);
        expect(supplies1.curSupply).toBe(0);

        await engine.execute(mint(alice, asset.assetId!, 2));
        const supplies2 = await engine.execute(readSupply(asset.assetId))
        expect(supplies2.maxSupply).toBe(10);
        expect(supplies2.curSupply).toBe(2);
    });
})
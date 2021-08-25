import {
    acceptBid,
    bidWithFiat,
    buyWithFiat,
    createAsset,
    createLazyOffer,
    createListOffer,
    hasCollectorCollection,
    lockOffering,
    mint,
    rejectBid,
    setItemPrice,
    setupCollector,
    setupCreator,
    unlockOffering
} from "../src";
import {v4 as uuid} from "uuid"
import {newAsset, newTeamAsset} from "./utils/assets";
import {readBids} from "../src/scripts/market/read-bids";
import {readTokenIds} from "../src/scripts/account/read-token-ids";
import {invalidBalance, invalidDemand, noItem} from "./utils/errors";
import {expectError} from "./utils/assertions";
import {readAssetIds} from "../src/scripts/account/read-asset-ids";
import {getBlockHeight, getEnv, setupEnv} from "./utils/setup-env";
import path from "path";
import {init} from "flow-js-testing";
import {readItemPrice} from "../src/scripts/market/read-item-price";
import getAccountAddress from "./utils/get-account-address";
import {getEvents} from "./utils/get-events";
import {checkSupply} from "../src/scripts/nft/check-supply";
import {readItemRecipients} from "../src/scripts/market/read-item-recipients";
import {readItemSupply} from "../src/scripts/market/read-item-supply";
import {removeMarketItem} from "../src/transactions/market/remove-market-item";
import {readStoreAssetId} from "../src/scripts/market/read-store-asset-ids";
import {lockMarketItem} from "../src/transactions/market/lock-market-item";
import {unlockMarketItem} from "../src/transactions/market/unlock-market-item";
import {hasCreatorCollection} from "../src/scripts/account/has-creator-collection";

const getUuid = require('uuid-by-string')

describe("test mintastic market contract", function () {
    beforeAll(async () => {
        jest.setTimeout(15000);
        init(path.resolve(__dirname, "../cadence"));
        await setupEnv()
    });

    test("buy NFT (off-chain, list offer)", async () => {
        const {engine, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));

        expect(await engine.execute(checkSupply(asset.assetId, 10))).toBeTruthy();

        // create a list offering
        const shares = [{creatorId: getUuid(alice) as string, share: "1.0"}]
        await engine.execute(mint(alice, asset.assetId!, 10));
        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0", shares))

        expect(await engine.execute(checkSupply(asset.assetId, 10))).toBeFalsy();

        // buy should fail when balance is too low
        await expectError(engine.execute(buyWithFiat(alice, bob, asset.assetId!, "100.0", 10)), invalidBalance);
        // buy should fail when demand exceeds supply
        await expectError(engine.execute(buyWithFiat(alice, bob, asset.assetId!, "1000.0", 12)), invalidDemand);

        await engine.execute(lockOffering(alice, asset.assetId!, 10))
        const result = await engine.execute(buyWithFiat(alice, bob, asset.assetId!, "1000.0", 2, true));
        // const result = await engine.execute(buyWithFiat(alice, bob, asset.assetId!, "1000.0", 2, true));
        console.log(JSON.stringify(result))
        await engine.execute(buyWithFiat(alice, bob, asset.assetId!, "1000.0", 6, true));
        await engine.execute(buyWithFiat(alice, bob, asset.assetId!, "1000.0", 2, true));

        // buy should fail when market item is sold out
        await expectError(engine.execute(buyWithFiat(alice, bob, asset.assetId!, "1000.0", 2)), noItem);
    });
    test("buy NFT (off-chain, lazy offer)", async () => {
        const {engine, mintastic, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));

        // create a lazy offering
        const shares = [{creatorId: getUuid(alice) as string, share: "1.0"}]
        await engine.execute(createLazyOffer(asset.assetId!, "1000.0", shares))

        // buy should fail when balance is too low
        await expectError(engine.execute(buyWithFiat(mintastic, bob, asset.assetId!, "100.0", 10)), invalidBalance);
        // buy should fail when demand exceeds supply
        await expectError(engine.execute(buyWithFiat(mintastic, bob, asset.assetId!, "1000.0", 12)), invalidDemand);

        await engine.execute(lockOffering(mintastic, asset.assetId!, 10))
        await engine.execute(buyWithFiat(mintastic, bob, asset.assetId!, "1000.0", 2, true));
        await engine.execute(buyWithFiat(mintastic, bob, asset.assetId!, "1000.0", 6, true));
        await engine.execute(buyWithFiat(mintastic, bob, asset.assetId!, "1000.0", 2, true));

        // buy should fail when market item is sold out
        await expectError(engine.execute(buyWithFiat(mintastic, bob, asset.assetId!, "1000.0", 2)), noItem);
    });
    test("accept bid NFT (off-chain, list offer)", async () => {
        const {engine, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));
        await engine.execute(mint(alice, asset.assetId!, 1));

        const ids = await engine.execute(readTokenIds(alice));

        const shares = [{creatorId: getUuid(alice) as string, share: "1.0"}]
        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0", shares))
        await engine.execute(bidWithFiat(alice, asset.assetId!, "500.0", 1));

        const bids = await engine.execute(readBids(alice, asset.assetId!));
        await engine.execute(acceptBid(alice, asset.assetId!, bids[0]));

        await engine.execute(buyWithFiat(alice, bob, asset.assetId!, "500.0", 1, true, bids[0]))

        expect(await engine.execute(readTokenIds(alice))).not.toContain(ids[ids.length - 1]);
        expect(await engine.execute(readTokenIds(bob))).toContain(ids[ids.length - 1]);
    });
    test("accept bid NFT (off-chain, lazy offer)", async () => {
        const {engine, mintastic, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));

        const shares = [{creatorId: getUuid(alice) as string, share: "1.0"}]
        await engine.execute(createLazyOffer(asset.assetId!, "1000.0", shares))
        await engine.execute(bidWithFiat(mintastic, asset.assetId!, "500.0", 1));

        expect(await engine.execute(readAssetIds(bob))).not.toContain(asset.assetId);

        const bids = await engine.execute(readBids(mintastic, asset.assetId!));
        console.log("bids", bids)
        console.log("assets", await engine.execute(readAssetIds(mintastic)))
        await engine.execute(acceptBid(mintastic, asset.assetId!, bids[0]));
        await engine.execute(buyWithFiat(mintastic, bob, asset.assetId!, "500.0", 1, false, bids[0]));

        // await engine.execute(transfer(mintastic, bob, asset.assetId!, 1))

        expect(await engine.execute(readAssetIds(bob))).toContain(asset.assetId);
    });
    test("reject bid NFT (off-chain, lazy offer)", async () => {
        const {engine, mintastic, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));

        const shares = [{creatorId: getUuid(alice) as string, share: "1.0"}]
        await engine.execute(createLazyOffer(asset.assetId!, "1000.0", shares))
        await engine.execute(bidWithFiat(mintastic, asset.assetId!, "500.0", 1));
        await engine.execute(bidWithFiat(mintastic, asset.assetId!, "450.0", 1));

        expect(await engine.execute(readAssetIds(bob))).not.toContain(asset.assetId);

        const bids = await engine.execute(readBids(mintastic, asset.assetId!));
        await engine.execute(rejectBid(mintastic, asset.assetId!, bids[0]));
        expect(await engine.execute(readBids(mintastic, asset.assetId!))).not.toContain(bids[0]);
    });
    test("share routing", async () => {
        const {engine, alice, bob} = await getEnv()

        // create an asset and insert it to market
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));
        await engine.execute(mint(alice, asset.assetId!, 1));
        const shares = [{creatorId: getUuid(alice) as string, share: "1.0"}]
        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0", shares))

        // sell the asset and insert it to market
        await engine.execute(buyWithFiat(alice, bob, asset.assetId!, "1000.0", 1));
        await engine.execute(setupCreator(bob))
        const shares2 = [{creatorId: getUuid(bob) as string, share: "1.0"}]
        await engine.execute(createListOffer(bob, asset.assetId!, "10000.0", shares2))

        // sell the asset with flow
        const buyer = await getAccountAddress("buyer-" + uuid())
        await engine.execute(setupCollector(buyer))
        await engine.execute(buyWithFiat(bob, buyer, asset.assetId!, "10000.0", 1));

        const events = await getEvents("MintasticMarket", "MarketItemPayout", await getBlockHeight());

        // service share
        expect(events[0].data.amount).toBe('1000.00000000');
        expect(events[0].data.recipient).toBe("mintastic");
        // royalty share
        expect(events[1].data.amount).toBe('1000.00000000');
        expect(events[1].data.recipient).toBe(shares[0].creatorId);
        // default share
        expect(events[2].data.amount).toBe('8000.00000000');
        expect(events[2].data.recipient).toBe(shares2[0].creatorId);
    });
    test("team creation share routing", async () => {
        const {engine, alice, bob, carol, dan} = await getEnv()

        const team = [
            {creatorId: getUuid(alice), share: "0.4"},
            {creatorId: getUuid(carol), share: "0.4"},
            {creatorId: getUuid(dan), share: "0.2"}
        ]
        // create an asset and insert it to market
        const asset = await engine.execute(createAsset(newTeamAsset(uuid(), team), 10));
        await engine.execute(mint(alice, asset.assetId!, 1));
        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0", team))

        // sell the asset and insert it to market
        await engine.execute(buyWithFiat(alice, bob, asset.assetId!, "1000.0", 1));

        const fiatEvents = await getEvents("MintasticMarket", "MarketItemPayout", await getBlockHeight());
        // service share
        expect(fiatEvents[0].data.amount).toBe('100.00000000');
        expect(fiatEvents[0].data.recipient).toBe("mintastic");
        // royalty share
        expect(fiatEvents[1].data.amount).toBe('40.00000000');
        expect(fiatEvents[1].data.recipient).toBe(getUuid(alice));
        expect(fiatEvents[2].data.amount).toBe('40.00000000');
        expect(fiatEvents[2].data.recipient).toBe(getUuid(carol));
        expect(fiatEvents[3].data.amount).toBe('20.00000000');
        expect(fiatEvents[3].data.recipient).toBe(getUuid(dan));
        // default share
        expect(fiatEvents[4].data.amount).toBe('320.00000000');
        expect(fiatEvents[4].data.recipient).toBe(getUuid(alice));
        expect(fiatEvents[5].data.amount).toBe('320.00000000');
        expect(fiatEvents[5].data.recipient).toBe(getUuid(carol));
        expect(fiatEvents[6].data.amount).toBe('160.00000000');
        expect(fiatEvents[6].data.recipient).toBe(getUuid(dan));

        await engine.execute(setupCreator(bob))
        const shares = [{creatorId: getUuid(bob), share: "1.0"}]
        await engine.execute(createListOffer(bob, asset.assetId!, "10000.0", shares))

        // sell the asset with flow
        const buyer = await getAccountAddress("buyer-" + uuid())
        await engine.execute(setupCollector(buyer))
        await engine.execute(buyWithFiat(bob, buyer, asset.assetId!, "10000.0", 1));

        const flowEvents = await getEvents("MintasticMarket", "MarketItemPayout", await getBlockHeight());
        // service share
        expect(flowEvents[0].data.amount).toBe('1000.00000000');
        expect(flowEvents[0].data.recipient).toBe("mintastic");
        // royalty share
        expect(flowEvents[1].data.amount).toBe('400.00000000');
        expect(flowEvents[1].data.recipient).toBe(getUuid(alice));
        expect(flowEvents[2].data.amount).toBe('400.00000000');
        expect(flowEvents[2].data.recipient).toBe(getUuid(carol));
        expect(flowEvents[3].data.amount).toBe('200.00000000');
        expect(flowEvents[3].data.recipient).toBe(getUuid(dan));
        // default share
        expect(flowEvents[4].data.amount).toBe('8000.00000000');
        expect(flowEvents[4].data.recipient).toBe(getUuid(bob));
    });
    test("accept multiple bid NFT (off-chain, list offer)", async () => {
        const {engine, alice, bob, blockHeight} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));
        await engine.execute(mint(alice, asset.assetId!, 5));

        const ids = await engine.execute(readTokenIds(alice));

        const shares = [{creatorId: getUuid(alice) as string, share: "1.0"}]
        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0", shares))
        await engine.execute(bidWithFiat(alice, asset.assetId!, "500.0", 1));
        await engine.execute(bidWithFiat(alice, asset.assetId!, "600.0", 2));
        await engine.execute(bidWithFiat(alice, asset.assetId!, "700.0", 3));
        await engine.execute(bidWithFiat(alice, asset.assetId!, "800.0", 4));
        await engine.execute(bidWithFiat(alice, asset.assetId!, "900.0", 5));

        const bids = await engine.execute(readBids(alice, asset.assetId!));
        expect(bids.length).toBe(5)

        await engine.execute(rejectBid(alice, asset.assetId, bids[0]))
        expect((await engine.execute(readBids(alice, asset.assetId!))).length).toBe(4)
        await engine.execute(rejectBid(alice, asset.assetId, bids[1]))
        expect((await engine.execute(readBids(alice, asset.assetId!))).length).toBe(3)
        await engine.execute(rejectBid(alice, asset.assetId, bids[2]))
        expect((await engine.execute(readBids(alice, asset.assetId!))).length).toBe(2)
        await engine.execute(rejectBid(alice, asset.assetId, bids[3]))
        expect((await engine.execute(readBids(alice, asset.assetId!))).length).toBe(1)
        await engine.execute(acceptBid(alice, asset.assetId!, bids[4]));
        expect((await engine.execute(readBids(alice, asset.assetId!))).length).toBe(1)

        await engine.execute(buyWithFiat(alice, bob, asset.assetId!, "900.0", 5, true, bids[4]))
        expect((await engine.execute(readBids(alice, asset.assetId!))).length).toBe(0);

        expect(await engine.execute(readTokenIds(alice))).not.toContain(ids[ids.length - 1]);
        expect(await engine.execute(readTokenIds(bob))).toContain(ids[ids.length - 1]);
    });
})
describe("test mintastic market admin functions", function () {
    beforeAll(async () => {
        jest.setTimeout(10000);
        init(path.resolve(__dirname, "../cadence"));
        await setupEnv()
    });

    test("change price of a market item", async () => {
        const {engine, alice} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));

        // create a list offering
        await engine.execute(mint(alice, asset.assetId!, 10));
        const shares = [{creatorId: getUuid(alice) as string, share: "1.0"}]
        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0", shares))

        expect(await engine.execute(readItemPrice(alice, asset.assetId!))).toBe(1000);
        await engine.execute(setItemPrice(alice, asset.assetId!, "500.0"))
        expect(await engine.execute(readItemPrice(alice, asset.assetId!))).toBe(500);
    });
    test("cannot change price when market item is locked", async () => {
        const {engine, alice} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));

        // create a list offering
        await engine.execute(mint(alice, asset.assetId!, 10));
        const shares = [{creatorId: getUuid(alice) as string, share: "1.0"}]
        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0", shares))

        await engine.execute(lockOffering(alice, asset.assetId, 2));
        await expect(engine.execute(setItemPrice(alice, asset.assetId!, "500.0"))).rejects.toContain("cannot change price")
        expect(await engine.execute(readItemPrice(alice, asset.assetId!))).toBe(1000);
    });

    test("get market item recipients", async () => {
        const {engine, alice} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));

        // create a list offering
        await engine.execute(mint(alice, asset.assetId!, 10));
        const shares = [{creatorId: getUuid(alice) as string, share: "1.0"}]
        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0", shares))

        console.log(await engine.execute(readItemRecipients(alice, asset.assetId)));
    });

    test("read market item supply of lazy offering", async () => {
        const {engine, alice, bob, mintastic} = await getEnv()

        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));
        const shares = [{creatorId: getUuid(alice) as string, share: "1.0"}]
        await engine.execute(createLazyOffer(asset.assetId!, "1000.0", shares))

        expect(await engine.execute(readItemSupply(mintastic, asset.assetId))).toBe(10);

        await engine.execute(lockOffering(mintastic, asset.assetId, 2));
        await engine.execute(buyWithFiat(mintastic, bob, asset.assetId!, "1000.0", 2, true));

        expect(await engine.execute(readItemSupply(mintastic, asset.assetId))).toBe(8);
    });
    test("read market item supply of list offering", async () => {
        const {engine, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));

        await engine.execute(mint(alice, asset.assetId!, 10));
        const shares = [{creatorId: getUuid(alice) as string, share: "1.0"}]
        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0", shares))

        expect(await engine.execute(readItemSupply(alice, asset.assetId))).toBe(10);

        await engine.execute(lockOffering(alice, asset.assetId, 2));
        await engine.execute(buyWithFiat(alice, bob, asset.assetId!, "1000.0", 2, true));

        expect(await engine.execute(readItemSupply(alice, asset.assetId))).toBe(8);
    });

    test("remove lazy market item", async () => {
        const {engine, alice, mintastic} = await getEnv()

        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));
        const shares = [{creatorId: getUuid(alice) as string, share: "1.0"}]
        await engine.execute(createLazyOffer(asset.assetId!, "1000.0", shares))

        expect(await engine.execute(readStoreAssetId(mintastic))).toContain(asset.assetId);
        await engine.execute(removeMarketItem(mintastic, asset.assetId));
        expect(await engine.execute(readStoreAssetId(mintastic))).not.toContain(asset.assetId);
    });

    test("remove list market item", async () => {
        const {engine, alice} = await getEnv()

        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));

        await engine.execute(mint(alice, asset.assetId!, 10));
        const shares = [{creatorId: getUuid(alice) as string, share: "1.0"}]
        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0", shares))

        expect(await engine.execute(readStoreAssetId(alice))).toContain(asset.assetId);
        await engine.execute(removeMarketItem(alice, asset.assetId));
        expect(await engine.execute(readStoreAssetId(alice))).not.toContain(asset.assetId);
    });

    test("cannot remove locked lazy market item", async () => {
        const {engine, alice, mintastic} = await getEnv()

        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));
        const shares = [{creatorId: getUuid(alice) as string, share: "1.0"}]
        await engine.execute(createLazyOffer(asset.assetId!, "1000.0", shares));
        await engine.execute(lockOffering(mintastic, asset.assetId, 2));

        expect(await engine.execute(readStoreAssetId(mintastic))).toContain(asset.assetId);
        await expect(engine.execute(removeMarketItem(mintastic, asset.assetId))).rejects.toContain("locked items")
    });

    test("cannot remove locked list market item", async () => {
        const {engine, alice} = await getEnv()

        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));
        await engine.execute(mint(alice, asset.assetId!, 10));

        const shares = [{creatorId: getUuid(alice) as string, share: "1.0"}]
        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0", shares));
        await engine.execute(lockOffering(alice, asset.assetId, 2));

        expect(await engine.execute(readStoreAssetId(alice))).toContain(asset.assetId);
        await expect(engine.execute(removeMarketItem(alice, asset.assetId))).rejects.toContain("locked items")
    });

    test("remove lazy market item after lock", async () => {
        const {engine, alice, mintastic} = await getEnv()

        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));
        const shares = [{creatorId: getUuid(alice) as string, share: "1.0"}]
        await engine.execute(createLazyOffer(asset.assetId!, "1000.0", shares));
        await engine.execute(lockOffering(mintastic, asset.assetId, 2));
        await engine.execute(lockMarketItem(mintastic, asset.assetId));

        expect(await engine.execute(readStoreAssetId(mintastic))).toContain(asset.assetId);
        await expect(engine.execute(removeMarketItem(mintastic, asset.assetId))).rejects.toContain("locked items")

        await engine.execute(unlockOffering(mintastic, asset.assetId, 2));
        await engine.execute(removeMarketItem(mintastic, asset.assetId))
    });

    test("lock market item", async () => {
        const {engine, alice, bob, mintastic} = await getEnv()

        const asset = await engine.execute(createAsset(newAsset(getUuid(alice), uuid()), 10));
        const shares = [{creatorId: getUuid(alice) as string, share: "1.0"}]
        await engine.execute(createLazyOffer(asset.assetId!, "1000.0", shares))

        await engine.execute(lockOffering(mintastic, asset.assetId, 2));
        await engine.execute(lockMarketItem(mintastic, asset.assetId));
        await expect(engine.execute(buyWithFiat(mintastic, bob, asset.assetId!, "1000.0", 2, true))).rejects.toContain("market item is locked");

        await engine.execute(unlockMarketItem(mintastic, asset.assetId));
        await engine.execute(buyWithFiat(mintastic, bob, asset.assetId!, "1000.0", 2, true));

        expect(await engine.execute(readItemSupply(mintastic, asset.assetId))).toBe(8);
    });

    test("test hasCreatorCollection", async () => {
        const {engine} = await getEnv();
        const account = await getAccountAddress(uuid());
        expect(await engine.execute(hasCreatorCollection(account))).toBeFalsy();

        await engine.execute(setupCreator(account));
        expect(await engine.execute(hasCreatorCollection(account))).toBeTruthy();

        // await engine.execute(destroyCreator(account));
        // expect(await engine.execute(hasCreatorCollection(account))).toBeFalsy();
    });

    test("test hasCollectorCollection", async () => {
        const {engine} = await getEnv();
        const account = await getAccountAddress(uuid());
        expect(await engine.execute(hasCollectorCollection(account))).toBeFalsy();

        await engine.execute(setupCollector(account));
        expect(await engine.execute(hasCollectorCollection(account))).toBeTruthy();
    });


})
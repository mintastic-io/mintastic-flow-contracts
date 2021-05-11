import {
    abortBid,
    acceptBid,
    bidWithFiat,
    bidWithFlow,
    buyWithFiat,
    buyWithFlow,
    createAsset,
    createLazyOffer,
    createListOffer,
    lockOffering,
    mint,
    rejectBid,
    setExchangeRate,
    setItemPrice,
    setupCollector,
    setupCreator,
    transfer
} from "../src";
import {v4 as uuid} from "uuid"
import {newAsset, newTeamAsset} from "./utils/assets";
import {readBids} from "../src/scripts/market/read-bids";
import {readTokenIds} from "../src/scripts/account/read-token-ids";
import {bidNotExpired, invalidBalance, invalidDemand, noItem} from "./utils/errors";
import {expectError} from "./utils/assertions";
import {readAssetIds} from "../src/scripts/account/read-asset-ids";
import {getBlock, getEnv, setupEnv} from "./utils/setup-env";
import path from "path";
import {init} from "flow-js-testing/dist/utils/init";
import {readItemPrice} from "../src/scripts/market/read-item-price";
import {mintFlow} from "../src/transactions/flow/mint-flow";
import {getBalance} from "../src/scripts/flow/get-balance";
import getAccountAddress from "./utils/get-account-address";
import {getEvents} from "./utils/get-events";
import {checkSupply} from "../src/scripts/nft/check-supply";
import {readItemRecipients} from "../src/scripts/market/read-item-recipients";

describe("test mintastic market contract", function () {
    beforeAll(async () => {
        jest.setTimeout(15000);
        init(path.resolve(__dirname, "../cadence"));
        await setupEnv()
    });

    test("buy NFT (off-chain, list offer)", async () => {
        const {engine, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(uuid(), uuid(), alice), 10));

        expect(await engine.execute(checkSupply(asset.assetId, 10))).toBeTruthy();

        // create a list offering
        await engine.execute(mint(alice, asset.assetId!, 10));
        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0"))

        expect(await engine.execute(checkSupply(asset.assetId, 10))).toBeFalsy();

        // buy should fail when balance is too low
        await expectError(engine.execute(buyWithFiat(alice, bob, asset.assetId!, "100.0", 10)), invalidBalance);
        // buy should fail when demand exceeds supply
        await expectError(engine.execute(buyWithFiat(alice, bob, asset.assetId!, "1000.0", 12)), invalidDemand);

        await engine.execute(lockOffering(alice, asset.assetId!, 10))
        await engine.execute(buyWithFiat(alice, bob, asset.assetId!, "1000.0", 2, true));
        await engine.execute(buyWithFiat(alice, bob, asset.assetId!, "1000.0", 6, true));
        await engine.execute(buyWithFiat(alice, bob, asset.assetId!, "1000.0", 2, true));

        // buy should fail when market item is sold out
        await expectError(engine.execute(buyWithFiat(alice, bob, asset.assetId!, "1000.0", 2)), noItem);
    });
    test("buy NFT (off-chain, lazy offer)", async () => {
        const {engine, mintastic, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(uuid(), uuid(), alice), 10));

        // create a lazy offering
        await engine.execute(createLazyOffer(alice, asset.assetId!, "1000.0"))

        // buy should fail when balance is too low
        await expectError(engine.execute(buyWithFiat(mintastic, bob, asset.assetId!, "100.0", 10)), invalidBalance);
        // buy should fail when demand exceeds supply
        await expectError(engine.execute(buyWithFiat(mintastic, bob, asset.assetId!, "1000.0", 12)), invalidDemand);

        await engine.execute(buyWithFiat(mintastic, bob, asset.assetId!, "1000.0", 2));
        await engine.execute(buyWithFiat(mintastic, bob, asset.assetId!, "1000.0", 6));
        await engine.execute(buyWithFiat(mintastic, bob, asset.assetId!, "1000.0", 2));

        // buy should fail when market item is sold out
        await expectError(engine.execute(buyWithFiat(mintastic, bob, asset.assetId!, "1000.0", 2)), noItem);
    });
    test("accept bid NFT (off-chain, list offer)", async () => {
        const {engine, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(uuid(), uuid(), alice), 10));
        await engine.execute(mint(alice, asset.assetId!, 1));

        const ids = await engine.execute(readTokenIds(alice));

        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0"))
        await engine.execute(bidWithFiat(alice, asset.assetId!, "500.0", 1));

        const bids = await engine.execute(readBids(alice, asset.assetId!));
        await engine.execute(acceptBid(alice, asset.assetId!, bids[0]));

        await engine.execute(transfer(bob, asset.assetId!, 1))

        expect(await engine.execute(readTokenIds(alice))).not.toContain(ids[ids.length - 1]);
        expect(await engine.execute(readTokenIds(bob))).toContain(ids[ids.length - 1]);
    });
    test("accept bid NFT (off-chain, lazy offer)", async () => {
        const {engine, mintastic, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(uuid(), uuid(), alice), 10));

        await engine.execute(createLazyOffer(alice, asset.assetId!, "1000.0"))
        await engine.execute(bidWithFiat(mintastic, asset.assetId!, "500.0", 1));

        expect(await engine.execute(readAssetIds(bob))).not.toContain(asset.assetId);

        const bids = await engine.execute(readBids(mintastic, asset.assetId!));
        await engine.execute(acceptBid(mintastic, asset.assetId!, bids[0]));

        await engine.execute(transfer(bob, asset.assetId!, 1))

        expect(await engine.execute(readAssetIds(bob))).toContain(asset.assetId);
    });
    test("reject bid NFT (off-chain, lazy offer)", async () => {
        const {engine, mintastic, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(uuid(), uuid(), alice), 10));

        await engine.execute(createLazyOffer(alice, asset.assetId!, "1000.0"))
        await engine.execute(bidWithFiat(mintastic, asset.assetId!, "500.0", 1));
        await engine.execute(bidWithFiat(mintastic, asset.assetId!, "450.0", 1));

        expect(await engine.execute(readAssetIds(bob))).not.toContain(asset.assetId);

        const bids = await engine.execute(readBids(mintastic, asset.assetId!));
        await engine.execute(rejectBid(mintastic, asset.assetId!, bids[0]));
        expect(await engine.execute(readBids(mintastic, asset.assetId!))).not.toContain(bids[0]);
    });
    test("abort  bid NFT (off-chain, lazy offer)", async () => {
        const {engine, mintastic, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(uuid(), uuid(), alice), 10));

        await engine.execute(createLazyOffer(alice, asset.assetId!, "1000.0"))
        await engine.execute(bidWithFiat(mintastic, asset.assetId!, "500.0", 1));
        await engine.execute(bidWithFiat(mintastic, asset.assetId!, "450.0", 1));

        expect(await engine.execute(readAssetIds(bob))).not.toContain(asset.assetId);

        const bids = await engine.execute(readBids(mintastic, asset.assetId!));
        expectError(engine.execute(abortBid(mintastic, asset.assetId!, bids[0])), bidNotExpired);
    });
    test("buy NFT (on-chain, list offer)", async () => {
        const {engine, alice} = await getEnv()

        // setup new buyer account
        const buyer = await getAccountAddress("buyer-" + uuid())
        await engine.execute(setupCollector(buyer))

        await engine.execute(mintFlow(buyer, "1000.0"))
        await engine.execute(setExchangeRate("flow", "25.0"))

        const asset = await engine.execute(createAsset(newAsset(uuid(), uuid(), alice), 10));

        // create a list offering
        await engine.execute(mint(alice, asset.assetId!, 10));
        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0"))

        // buy should fail when balance is too low
        await expectError(engine.execute(buyWithFlow(alice, buyer, asset.assetId!, "100.0", 10)), invalidBalance);
        // buy should fail when demand exceeds supply
        await expectError(engine.execute(buyWithFlow(alice, buyer, asset.assetId!, "1000.0", 12)), invalidDemand);

        expect(await engine.execute(getBalance(buyer))).toBe(1000.1)
        await engine.execute(buyWithFlow(alice, buyer, asset.assetId!, "1000.0", 2));
        expect(await engine.execute(getBalance(buyer))).toBe(920.1)
        await engine.execute(buyWithFlow(alice, buyer, asset.assetId!, "1000.0", 6));
        await engine.execute(buyWithFlow(alice, buyer, asset.assetId!, "1000.0", 2));
        expect(await engine.execute(getBalance(buyer))).toBe(600.1)

        // buy should fail when market item is sold out
        await expectError(engine.execute(buyWithFlow(alice, buyer, asset.assetId!, "1000.0", 2)), noItem);
    });
    test("buy NFT (on-chain, lazy offer)", async () => {
        const {engine, alice, mintastic} = await getEnv()

        // setup new buyer account
        const buyer = await getAccountAddress("buyer-" + uuid())
        await engine.execute(setupCollector(buyer))

        await engine.execute(mintFlow(buyer, "1000.0"))
        await engine.execute(setExchangeRate("flow", "25.0"))

        const asset = await engine.execute(createAsset(newAsset(uuid(), uuid(), alice), 10));
        await engine.execute(createLazyOffer(alice, asset.assetId!, "1000.0"))

        // buy should fail when balance is too low
        await expectError(engine.execute(buyWithFlow(mintastic, buyer, asset.assetId!, "100.0", 10)), invalidBalance);
        // buy should fail when demand exceeds supply
        await expectError(engine.execute(buyWithFlow(mintastic, buyer, asset.assetId!, "1000.0", 12)), invalidDemand);

        expect(await engine.execute(getBalance(buyer))).toBe(1000.1)
        await engine.execute(buyWithFlow(mintastic, buyer, asset.assetId!, "1000.0", 2));
        expect(await engine.execute(getBalance(buyer))).toBe(920.1)
        await engine.execute(buyWithFlow(mintastic, buyer, asset.assetId!, "1000.0", 6));
        await engine.execute(buyWithFlow(mintastic, buyer, asset.assetId!, "1000.0", 2));
        expect(await engine.execute(getBalance(buyer))).toBe(600.1)

        // buy should fail when market item is sold out
        await expectError(engine.execute(buyWithFlow(mintastic, buyer, asset.assetId!, "1000.0", 2)), noItem);
    });
    test("accept bid NFT (on-chain, list offer)", async () => {
        const {engine, alice} = await getEnv()

        // setup new buyer account
        const buyer = await getAccountAddress("buyer-" + uuid())
        await engine.execute(setupCollector(buyer))

        await engine.execute(mintFlow(buyer, "1000.0"))
        await engine.execute(setExchangeRate("flow", "25.0"))

        const asset = await engine.execute(createAsset(newAsset(uuid(), uuid(), alice), 10));
        await engine.execute(mint(alice, asset.assetId!, 1));

        const ids = await engine.execute(readTokenIds(alice));

        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0"))
        await engine.execute(bidWithFlow(alice, buyer, asset.assetId!, "500.0", 1));

        const bids = await engine.execute(readBids(alice, asset.assetId!));
        await engine.execute(acceptBid(alice, asset.assetId!, bids[0]));

        expect(await engine.execute(readTokenIds(alice))).not.toContain(ids[ids.length - 1]);
        expect(await engine.execute(readTokenIds(buyer))).toContain(ids[ids.length - 1]);
    });
    test("share routing", async () => {
        const {engine, alice, bob, mintastic, blockHeight} = await getEnv()

        // create an asset and insert it to market
        const asset = await engine.execute(createAsset(newAsset(uuid(), uuid(), alice), 10));
        await engine.execute(mint(alice, asset.assetId!, 1));
        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0"))

        // sell the asset and insert it to market
        await engine.execute(buyWithFiat(alice, bob, asset.assetId!, "1000.0", 1));
        await engine.execute(setupCreator(bob))
        await engine.execute(createListOffer(bob, asset.assetId!, "10000.0"))

        const mintasticBalance = await engine.execute(getBalance(mintastic));
        const aliceBalance = await engine.execute(getBalance(alice));
        const bobBalance = await engine.execute(getBalance(bob));

        // sell the asset with flow
        const buyer = await getAccountAddress("buyer-" + uuid())
        await engine.execute(setupCollector(buyer))
        await engine.execute(mintFlow(buyer, "1000.0"))
        await engine.execute(buyWithFlow(bob, buyer, asset.assetId!, "10000.0", 1));

        const events = await getEvents("FlowPaymentProvider", "FlowPaid", await getBlock());
        // service share
        expect(events[0].data.amount).toBe('1000.00000000');
        expect(events[0].data.recipient).toBe(mintastic);
        // royalty share
        expect(events[1].data.amount).toBe('1000.00000000');
        expect(events[1].data.recipient).toBe(alice);
        // default share
        expect(events[2].data.amount).toBe('8000.00000000');
        expect(events[2].data.recipient).toBe(bob);

        expect(await engine.execute(getBalance(mintastic))).toBe(mintasticBalance + 40)
        expect(await engine.execute(getBalance(alice))).toBe(aliceBalance + 40)
        expect(await engine.execute(getBalance(bob))).toBe(bobBalance + 320)
        expect(await engine.execute(getBalance(buyer))).toBe(600.1)
    });
    test("team creation share routing", async () => {
        const {engine, alice, bob, mintastic, carol, dan, blockHeight} = await getEnv()

        const team = [{address: alice, share: "0.4"}, {address: carol, share: "0.4"}, {address: dan, share: "0.2"}]
        // create an asset and insert it to market
        const asset = await engine.execute(createAsset(newTeamAsset(uuid(), uuid(), team), 10));
        await engine.execute(mint(alice, asset.assetId!, 1));
        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0", team))

        // sell the asset and insert it to market
        await engine.execute(buyWithFiat(alice, bob, asset.assetId!, "1000.0", 1));

        const fiatEvents = await getEvents("FiatPaymentProvider", "FiatPaid", blockHeight);
        // service share
        expect(fiatEvents[0].data.amount).toBe('100.00000000');
        expect(fiatEvents[0].data.recipient).toBe(mintastic);
        // royalty share
        expect(fiatEvents[1].data.amount).toBe('40.00000000');
        expect(fiatEvents[1].data.recipient).toBe(alice);
        expect(fiatEvents[2].data.amount).toBe('40.00000000');
        expect(fiatEvents[2].data.recipient).toBe(carol);
        expect(fiatEvents[3].data.amount).toBe('20.00000000');
        expect(fiatEvents[3].data.recipient).toBe(dan);
        // default share
        expect(fiatEvents[4].data.amount).toBe('320.00000000');
        expect(fiatEvents[4].data.recipient).toBe(alice);
        expect(fiatEvents[5].data.amount).toBe('320.00000000');
        expect(fiatEvents[5].data.recipient).toBe(carol);
        expect(fiatEvents[6].data.amount).toBe('160.00000000');
        expect(fiatEvents[6].data.recipient).toBe(dan);

        const mintasticBalance = await engine.execute(getBalance(mintastic));
        const aliceBalance = await engine.execute(getBalance(alice));
        const bobBalance = await engine.execute(getBalance(bob));
        const carolBalance = await engine.execute(getBalance(carol));
        const danBalance = await engine.execute(getBalance(dan));

        await engine.execute(setupCreator(bob))
        await engine.execute(createListOffer(bob, asset.assetId!, "10000.0"))

        // sell the asset with flow
        const buyer = await getAccountAddress("buyer-" + uuid())
        await engine.execute(setupCollector(buyer))
        await engine.execute(mintFlow(buyer, "1000.0"))
        await engine.execute(buyWithFlow(bob, buyer, asset.assetId!, "10000.0", 1));

        const flowEvents = await getEvents("FlowPaymentProvider", "FlowPaid", await getBlock());
        // service share
        expect(flowEvents[0].data.amount).toBe('1000.00000000');
        expect(flowEvents[0].data.recipient).toBe(mintastic);
        // royalty share
        expect(flowEvents[1].data.amount).toBe('400.00000000');
        expect(flowEvents[1].data.recipient).toBe(alice);
        expect(flowEvents[2].data.amount).toBe('400.00000000');
        expect(flowEvents[2].data.recipient).toBe(carol);
        expect(flowEvents[3].data.amount).toBe('200.00000000');
        expect(flowEvents[3].data.recipient).toBe(dan);
        // default share
        expect(flowEvents[4].data.amount).toBe('8000.00000000');
        expect(flowEvents[4].data.recipient).toBe(bob);

        expect(await engine.execute(getBalance(mintastic))).toBe(mintasticBalance + 40)
        expect(await engine.execute(getBalance(alice))).toBe(aliceBalance + 16)
        expect(await engine.execute(getBalance(bob))).toBe(bobBalance + 320)
        expect(await engine.execute(getBalance(carol))).toBe(carolBalance + 16)
        expect(await engine.execute(getBalance(dan))).toBe(danBalance + 8)
        expect(await engine.execute(getBalance(buyer))).toBe(600.1)
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
        const asset = await engine.execute(createAsset(newAsset(uuid(), uuid(), alice), 10));

        // create a list offering
        await engine.execute(mint(alice, asset.assetId!, 10));
        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0"))

        expect(await engine.execute(readItemPrice(alice, asset.assetId!))).toBe(1000);
        await engine.execute(setItemPrice(alice, asset.assetId!, "500.0"))
        expect(await engine.execute(readItemPrice(alice, asset.assetId!))).toBe(500);
    });
    test("cannot change price when market item is locked", async () => {
        const {engine, alice} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(uuid(), uuid(), alice), 10));

        // create a list offering
        await engine.execute(mint(alice, asset.assetId!, 10));
        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0"))

        await engine.execute(lockOffering(alice, asset.assetId, 2));
        await expect(engine.execute(setItemPrice(alice, asset.assetId!, "500.0"))).rejects.toContain("cannot change price")
        expect(await engine.execute(readItemPrice(alice, asset.assetId!))).toBe(1000);
    });

    test("get market item recipients", async () => {
        const {engine, alice} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(uuid(), uuid(), alice), 10));

        // create a list offering
        await engine.execute(mint(alice, asset.assetId!, 10));
        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0"))

        console.log(await engine.execute(readItemRecipients(alice, asset.assetId)));
    });
})
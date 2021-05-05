import {createAsset, mint, setupCollector} from "../src";
import {v4 as uuid} from "uuid"
import {newAsset} from "./utils/assets";
import {createListOffer} from "../src/transactions/market/create-list-offer";
import {buyWithFiat} from "../src/transactions/market/buy-with-fiat";
import {createLazyOffer} from "../src/transactions/market/create-lazy-offer";
import {bidWithFiat} from "../src/transactions/market/bid-with-fiat";
import {readBids} from "../src/scripts/market/read-bids";
import {acceptBid} from "../src/transactions/market/accept-bid";
import {readTokenIds} from "../src/scripts/account/read-token-ids";
import {bidNotExpired, invalidBalance, invalidDemand, noItem} from "./utils/errors";
import {expectError} from "./utils/assertions";
import {readAssetIds} from "../src/scripts/account/read-asset-ids";
import {rejectBid} from "../src/transactions/market/reject-bid";
import {abortBid} from "../src/transactions/market/abort-bid";
import {getEnv, setupEnv} from "./utils/setup-env";
import path from "path";
import {init} from "flow-js-testing/dist/utils/init";
import {readItemPrice} from "../src/scripts/market/read-item-price";
import {setItemPrice} from "../src/transactions/market/set-item-price";
import {mintFlow} from "../src/transactions/flow/mint-flow";
import {getBalance} from "../src/scripts/flow/get-balance";
import {buyWithFlow} from "../src/transactions/market/buy-with-flow";
import getAccountAddress from "./utils/get-account-address";
import {setExchangeRate} from "../src/transactions/credit/set-exchange-rate";
import {bidWithFlow} from "../src/transactions/market/bid-with-flow";
import {setupCreator} from "../src/transactions/account/setup-creator";
import {getEvents} from "./utils/get-events";
import {lockOffering} from "../src/transactions/market/lock-offering";

describe("test mintastic market contract", function () {
    beforeAll(async () => {
        jest.setTimeout(10000);
        init(path.resolve(__dirname, "../cadence"));
        await setupEnv()
    });

    test("buy NFT (off-chain, list offer)", async () => {
        const {engine, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(uuid(), uuid(), alice), 10));

        // create a list offering
        await engine.execute(mint(alice, asset.assetId!, 10));
        await engine.execute(createListOffer(alice, asset.assetId!, "1000.0"))

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
        await engine.execute(bidWithFiat(alice, bob, asset.assetId!, "500.0", 1));

        const bids = await engine.execute(readBids(alice, asset.assetId!));
        await engine.execute(acceptBid(alice, asset.assetId!, bids[0]));

        expect(await engine.execute(readTokenIds(alice))).not.toContain(ids[ids.length - 1]);
        expect(await engine.execute(readTokenIds(bob))).toContain(ids[ids.length - 1]);
    });
    test("accept bid NFT (off-chain, lazy offer)", async () => {
        const {engine, mintastic, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(uuid(), uuid(), alice), 10));

        await engine.execute(createLazyOffer(alice, asset.assetId!, "1000.0"))
        await engine.execute(bidWithFiat(mintastic, bob, asset.assetId!, "500.0", 1));

        expect(await engine.execute(readAssetIds(bob))).not.toContain(asset.assetId);

        const bids = await engine.execute(readBids(mintastic, asset.assetId!));
        await engine.execute(acceptBid(mintastic, asset.assetId!, bids[0]));

        expect(await engine.execute(readAssetIds(bob))).toContain(asset.assetId);
    });
    test("reject bid NFT (off-chain, lazy offer)", async () => {
        const {engine, mintastic, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(uuid(), uuid(), alice), 10));

        await engine.execute(createLazyOffer(alice, asset.assetId!, "1000.0"))
        await engine.execute(bidWithFiat(mintastic, bob, asset.assetId!, "500.0", 1));
        await engine.execute(bidWithFiat(mintastic, bob, asset.assetId!, "450.0", 1));

        expect(await engine.execute(readAssetIds(bob))).not.toContain(asset.assetId);

        const bids = await engine.execute(readBids(mintastic, asset.assetId!));
        await engine.execute(rejectBid(mintastic, asset.assetId!, bids[0]));
        expect(await engine.execute(readBids(mintastic, asset.assetId!))).not.toContain(bids[0]);
    });
    test("abort  bid NFT (off-chain, lazy offer)", async () => {
        const {engine, mintastic, alice, bob} = await getEnv()
        const asset = await engine.execute(createAsset(newAsset(uuid(), uuid(), alice), 10));

        await engine.execute(createLazyOffer(alice, asset.assetId!, "1000.0"))
        await engine.execute(bidWithFiat(mintastic, bob, asset.assetId!, "500.0", 1));
        await engine.execute(bidWithFiat(mintastic, bob, asset.assetId!, "450.0", 1));

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

        // sell the asset with flow
        const buyer = await getAccountAddress("buyer-" + uuid())
        await engine.execute(setupCollector(buyer))
        await engine.execute(mintFlow(buyer, "1000.0"))
        await engine.execute(buyWithFlow(bob, buyer, asset.assetId!, "10000.0", 1));

        const events = await getEvents("FlowPaymentProvider", "FlowPaid", blockHeight);
        expect(events.length >= 3).toBeTruthy();

        console.log(await engine.execute(getBalance(mintastic)))
        console.log(await engine.execute(getBalance(alice)))
        console.log(await engine.execute(getBalance(bob)))
        console.log(await engine.execute(getBalance(buyer)))
    });
})
describe("test mintastic market admin functions", function () {
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
})
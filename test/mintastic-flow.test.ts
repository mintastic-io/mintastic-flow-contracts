import {createAccount} from "../src";
import {getEnv, setupEnv} from "./utils/setup-env";
import path from "path";
import {init} from "flow-js-testing";
import {transferFlow} from "../src/transactions/flow/transfer-flow";
import {getBalance} from "../src/scripts/flow/get-balance";

describe("test mintastic market contract", function () {
    beforeAll(async () => {
        jest.setTimeout(15000);
        init(path.resolve(__dirname, "../cadence"));
        await setupEnv()
    });

    test("transfer flow tokens", async () => {
        const {engine, mintastic} = await getEnv()
        const recipient = await engine.execute(createAccount())
        await engine.execute(transferFlow(mintastic, recipient, "10.0"))

        expect(await engine.execute(getBalance(recipient))).toBe(10.001)
    });

})
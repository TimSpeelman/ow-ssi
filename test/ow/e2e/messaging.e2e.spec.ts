import { OWAPI } from "../../../src/ow/api/OWAPI";
import { OWMessageDispatch } from "../../../src/ow/events/OWMessageDispatch";
import { OWObserver } from "../../../src/ow/events/OWObserver";
import { describe, expect, it } from "../../tools";

const alicePort = 10001;
const bobPort = 10002;

describe("OpenWallet Messaging end-to-end", function () {

    const alice = new OWAPI(`http://localhost:${alicePort}`);
    const bob = new OWAPI(`http://localhost:${bobPort}`);


    let alicesMid: string;
    let bobsMid: string;
    let bobObserver: OWObserver;
    let bobDispatch: OWMessageDispatch;

    this.beforeAll(async () => {
        if (!await alice.verifyOnline()) throw new Error("API is Offline")
        if (!await bob.verifyOnline()) throw new Error("API is Offline")
        alicesMid = await alice.getMyId();
        bobsMid = await bob.getMyId();
    })

    this.beforeEach(() => {
        bobObserver = new OWObserver(bob, 100);
        bobObserver.start();

        bobDispatch = new OWMessageDispatch(bobObserver);
    })

    it("can send a message from alice to chris", function (done) {

        alice.sendMessage(bobsMid, "Hi Bob!").catch(done);
        bobDispatch.addHandler((message) => {
            expect(message).to.have.property("message", "Hi Bob!");
            expect(message).to.have.property("sender_mid_b64", alicesMid);
            done();
            return true;
        })

    })

});
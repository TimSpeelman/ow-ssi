import { OpenWalletAPI } from "../../../src/ow/api/OpenWalletAPI";
import { OpenWalletObserver } from "../../../src/ow/events/OpenWalletObserver";
import { describe, expect, it } from "../../tools";

const alicePort = 10001;
const bobPort = 10002;

describe("OpenWallet Messaging end-to-end", function () {

    const alice = new OpenWalletAPI(`http://localhost:${alicePort}`);
    const bob = new OpenWalletAPI(`http://localhost:${bobPort}`);


    let alicesMid: string;
    let bobsMid: string;
    let bobObserver: OpenWalletObserver;

    this.beforeAll(async () => {
        if (!await alice.verifyOnline()) throw new Error("API is Offline")
        if (!await bob.verifyOnline()) throw new Error("API is Offline")
        alicesMid = await alice.getMyId();
        bobsMid = await bob.getMyId();
    })

    this.beforeEach(() => {
        bobObserver = new OpenWalletObserver(bob, 100);
        bobObserver.start();
    })

    it("can send a message from alice to chris", function (done) {

        alice.sendMessage(bobsMid, "Hi Bob!").catch(done);

        bobObserver.onMessageFound((message) => {
            expect(message).to.have.property("message", "Hi Bob!");
            expect(message).to.have.property("sender_mid_b64", alicesMid);
            done();
        })

    })

});
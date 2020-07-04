import { OpenWalletAPI } from "../../../src/ow/api/OpenWalletAPI";
import { cancelAfter, cancellable } from "../../../src/util/cancellable";
import { describe, expect, it } from "../../tools";

const alicePort = 10001;
const bobPort = 10002;

describe("OpenWallet Messaging end-to-end", function () {

    const alice = new OpenWalletAPI(`http://localhost:${alicePort}`);
    const bob = new OpenWalletAPI(`http://localhost:${bobPort}`);

    let alicesMid: string;
    let bobsMid: string;

    this.beforeAll(async () => {
        if (!await alice.verifyOnline()) throw new Error("API is Offline")
        if (!await bob.verifyOnline()) throw new Error("API is Offline")
        alicesMid = await alice.getMyId();
        bobsMid = await bob.getMyId();
    })

    it("can send a message from alice to chris", async function () {

        await alice.sendMessage(bobsMid, "Hi Bob!");

        const iv = 100;
        const pollForMessage = cancellable((onCancel) =>
            new Promise(resolve => {
                const i = setInterval(async () => {
                    const inbox = await bob.getMessageInbox();
                    if (inbox.length > 0) {
                        resolve(inbox[0])
                    }
                }, iv)
                onCancel(() => clearInterval(i));
            }))
        const timeout = 1000; // ms

        const message = await cancelAfter(timeout)(pollForMessage).promise;

        expect(message).to.have.property("message", "Hi Bob!");
        expect(message).to.have.property("sender_mid_b64", alicesMid);

    })

});
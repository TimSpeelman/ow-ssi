import uuid from "uuid/v4";
import { IPv8Service } from "../../../src/ipv8/IPv8Service";
import { OWAgent } from "../../../src/ow/OWAgent";
import { OWAttestOffer } from "../../../src/ow/protocol/types";
import { describe, expect, it } from "../../tools";

const alicePort = 10001;
const bobPort = 10002;
const pollInterval = 200;

describe("OWAttest automatically and fully over IPv8", function () {

    const ALICE = new OWAgent(`http://localhost:${alicePort}`);
    const BOB = new OWAgent(`http://localhost:${bobPort}`);

    let alice: IPv8Service;
    let bob: IPv8Service;

    let alicesMid: string;
    let bobsMid: string;

    const sessionId = uuid(); // We use this to distinguish from other sessions

    this.beforeAll(async () => {
        await ALICE.start();
        alicesMid = ALICE.mid;
        alice = ALICE.service;

        await BOB.start();
        bobsMid = BOB.mid;
        bob = BOB.service;
    })

    it("attests based on an OWAttestOffer", function (done) {

        // SETUP Alice
        ALICE.attestOfferHandler = async (session) => {
            if (session.offer.ref === sessionId) {
                return true; // accept the offer
            } else {
                console.log(`Skipping session ${session.offer.ref}`)
                return false;
            }
        }

        const offer: OWAttestOffer = {
            type: "OWAttestOffer",
            ref: sessionId,
            attester_id: bobsMid,
            subject_id: alicesMid,
            attributes: [
                { ref: "x", name: sessionId + "::a1", format: "id_metadata", value: "v1" },
                { ref: "y", name: sessionId + "::a3", format: "id_metadata", value: "v1" }
            ],
            expiresAtTimeInMillis: Date.now() + 10000
        };

        BOB.ter.attest(offer).then((session) => {

            expect(session.isAttested).to.equal(true);
            done();

        }).catch(done)


    })

});

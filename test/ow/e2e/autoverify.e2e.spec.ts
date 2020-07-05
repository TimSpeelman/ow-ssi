import uuid from "uuid/v4";
import { IPv8Service } from "../../../src/ipv8/IPv8Service";
import { OWAgent } from "../../../src/ow/OWAgent";
import { OWVerifyRequest } from "../../../src/ow/protocol/types";
import { attest } from "../../ipv8/attest";
import { describe, expect, it } from "../../tools";

const alicePort = 10001;
const bobPort = 10002;
const pollInterval = 200;

// const aliceConf = loadTemporaryIPv8Configuration('test-alice')
// const bobConf = loadTemporaryIPv8Configuration('test-bob')

// const config = {
//     aliceUrl: `http://localhost:${aliceConf.port}`,
//     aliceMid: alicesMid,
//     bobUrl: `http://localhost:${bobConf.port}`,
//     bobMid: bobsMid,
//     pollInterval: 200,
// }

/**
 * Alice and Bob communicate only over IPv8, except Alice's mid.
 * Bob verifies Alice. Alice consents to everything. 
 *
 * - Bob.verify(mid_alice, attr:name) => Alice
 *   - send VREQ
 *   - await VRESP, check against VREQ
 *   - verify over IPv8
 *   - await result(s)
 * 
 * - Alice.handleReq(VREQ)
 *   - check,
 *   - resolve -> VRESP
 *   - ask consent (VREQ/VRESP)
 *   - stage verify
 *
 * - Bob -> Alice: OWVerifyRequest(attr: name)
 * - Alice -> Bob: OWVerifyResponse(name: Alice)
 * - [IPv8 verification]
 * - Bob: verified `name`: Alice. 
 * 
 * Unhappies:
 * - Bob sends an incorrect request
 * - Alice does not have the requested attribute
 * - Alice sends a non matching response
 * - Alice sends an incorrect response
 * - Alice sends a fake value
 * - Alice does not respond
 * - Bob tries to verify a different attribute
 * - Bob tries to verify a different value
 */
describe("OWVerify automatically and fully over IPv8", function () {

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

        // Before verification, we must attest
        const attributes = [
            { attribute_name: sessionId + "::a1", attribute_value: "v1" },
            { attribute_name: sessionId + "::a2", attribute_value: "v2" },
            { attribute_name: sessionId + "::a3", attribute_value: "v3" },
        ]

        // Attest and save to Alice's repo
        const attested = await attest(bob.attesterService, alice.attesteeService, bobsMid, alicesMid, attributes);
        await Promise.all(attested.map(a => ALICE.repo.put(a)))
    })

    it("verifies based on an OW req/resp pair", function (done) {

        // SETUP Alice
        ALICE.verifyRequestHandler = async (session, result) => {
            if (session.request.ref === sessionId) {

                expect(result.status).to.equal("success");

                // And accepts the request with that response.
                return result.response;
            } else {
                console.log(`Skipping session ${session.request.ref}`)
            }
        }

        const request: OWVerifyRequest = {
            type: "OWVerifyRequest",
            ref: sessionId,
            verifier_id: bobsMid,
            subject_id: alicesMid,
            attributes: [
                { ref: "x", name: sessionId + "::a1", format: "id_metadata", include_value: true },
                { ref: "y", name: sessionId + "::a3", format: "id_metadata", include_value: true }
            ],
        };

        BOB.ver.verify(request).then((session) => {

            expect(session.isVerified).to.equal(true);
            const expectedValues = ["v1", "v3"];
            expect(session.response.attributes.map(a => a.value)).to.deep.equal(expectedValues); // FIXME
            done();

        }).catch(done)

        // Alice will respond, which will fire the status hook with status:ACCEPTED
        // Bob then verifies.     

    })

});

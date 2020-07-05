import uuid from "uuid/v4";
import { IPv8Service } from "../../../src/ipv8/IPv8Service";
import { OWAPI } from "../../../src/ow/api/OWAPI";
import { OWMessageDispatch } from "../../../src/ow/events/OWMessageDispatch";
import { OWObserver } from "../../../src/ow/events/OWObserver";
import { OWVee } from "../../../src/ow/protocol/OWVee";
import { OWVer } from "../../../src/ow/protocol/OWVer";
import { OWVerificationStatus } from "../../../src/ow/protocol/OWVerification";
import { OWVerifyRequest } from "../../../src/ow/protocol/types";
import { OWVerifyRequestResolver } from "../../../src/ow/resolution/OWVerifyRequestResolver";
import { attest } from "../../ipv8/attest";
import { describe, expect, it } from "../../tools";
import { mockRepo } from "../mockRepo";

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
    const aliceUrl = `http://localhost:${alicePort}`
    const aliceAPI = new OWAPI(aliceUrl);

    const bobUrl = `http://localhost:${bobPort}`;
    const bobAPI = new OWAPI(bobUrl);

    let alice: IPv8Service;
    let bob: IPv8Service;

    let alicesMid: string;
    let bobsMid: string;
    let bobObserver: OWObserver;
    let bobDispatch: OWMessageDispatch;

    const aliceRepo = mockRepo([]);

    this.beforeAll(async () => {
        if (!await aliceAPI.verifyOnline()) throw new Error("API is Offline")
        alicesMid = await aliceAPI.getMyId();
        alice = new IPv8Service(aliceUrl, pollInterval);
        alice.start();

        if (!await bobAPI.verifyOnline()) throw new Error("API is Offline")
        bobsMid = await bobAPI.getMyId();
        bob = new IPv8Service(bobUrl, pollInterval);
        bob.start();

        // Before verification, we must attest
        const attributes = [
            { attribute_name: "a1", attribute_value: "v1" },
            { attribute_name: "a2", attribute_value: "v2" },
            { attribute_name: "a3", attribute_value: "v3" },
        ]

        // Attest and save to Alice's repo
        const attested = await attest(bob.attesterService, alice.attesteeService, bobsMid, alicesMid, attributes);
        attested.map(a => aliceRepo.put(a))
    })

    it("verifies based on an OW req/resp pair", function (done) {

        const sessionId = uuid(); // We use this to distinguish from other sessions

        // SETUP Alice
        const aliceResolver = new OWVerifyRequestResolver(alicesMid, aliceRepo);

        const aliceAPI = new OWAPI(aliceUrl)
        const $alice = new OWVee(alicesMid, aliceAPI, alice.verifieeService)
        const aliceObserver = new OWObserver(aliceAPI, 100); // FIXME This is also an IPv8observer!
        aliceObserver.start();
        const aliceDispatch = new OWMessageDispatch(aliceObserver);
        aliceDispatch.addHandler((message) => { $alice.handleRequestMessage(message); return true });
        $alice.newSessionHook.on((session) => {
            if (session.request.ref !== sessionId) {
                console.log(`Skipping session ${session.request.ref}`)
                return;
            }

            // She binds to status updates
            session.statusHook.on((status) => {
                // When a request comes in..
                if (status === OWVerificationStatus.REQUESTED) {
                    // Alice resolves this to a response..
                    aliceResolver.resolveRequest(session.request).then((result) => {
                        expect(result.status).to.equal("success");
                        const response = result.response;
                        // Manipulate response
                        response.attributes[0].value = "vx";
                        // And accepts the request with that response.
                        $alice.acceptSession(session, response).catch(done);
                    }).catch(done)
                }
            })

        })

        // SETUP Bob

        const bobAPI = new OWAPI(bobUrl)
        const $bob = new OWVer(bobsMid, bobAPI, bob.verifierService)
        const bobObserver = new OWObserver(bobAPI, 100); // FIXME This is also an IPv8observer!
        bobObserver.start();
        const bobDispatch = new OWMessageDispatch(bobObserver);
        bobDispatch.addHandler((message) => { $bob.handleResponseMessage(message); return true });

        const request: OWVerifyRequest = {
            ref: sessionId,
            verifier_id: bobsMid,
            subject_id: alicesMid,
            attributes: [
                { ref: "x", name: "a1", format: "id_metadata", include_value: true },
                { ref: "y", name: "a3", format: "id_metadata", include_value: true }
            ],
        };

        // Bob creates a new session
        const bobSession = $bob.newSessionFromRequest(request);

        // He binds to status updates
        bobSession.statusHook.on((status) => {
            // Bob automatically verifies when the verifiee accepts his request
            if (status === OWVerificationStatus.ACCEPTED) {
                $bob.verifySession(bobSession);
            }

            // The test succeeds when the status is verified and the result is positive
            if (status === OWVerificationStatus.VERIFIED) {
                expect(bobSession.result).to.equal(true); // FIXME
                done();
            }
        })

        // Bob now sends the request to Alice
        const requestSent = $bob.sendRequest(bobSession);

        // Alice will respond, which will fire the status hook with status:ACCEPTED
        // Bob then verifies.     

    })

});

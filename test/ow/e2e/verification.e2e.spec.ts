import { IPv8Service } from "../../../src/ipv8/IPv8Service";
import { OWVerifyRequestHandler } from "../../../src/ow/OWVerifyRequestHandler";
import { OWVerifiee } from "../../../src/ow/protocol/OWVerifiee";
import { OWVerifier } from "../../../src/ow/protocol/OWVerifier";
import { OWVerifyRequest, OWVerifyResponse } from "../../../src/ow/protocol/types";
import { OWVerifyRequestResolver } from "../../../src/ow/resolution/OWVerifyRequestResolver";
import { loadTemporaryIPv8Configuration } from "../../../src/util/ipv8conf";
import { attest } from "../../ipv8/attest";
import { before, describe, expect, it } from "../../tools";
import { mockRepo } from "../mockRepo";

const aliceConf = loadTemporaryIPv8Configuration('test-alice')
const bobConf = loadTemporaryIPv8Configuration('test-bob')

const config = {
    aliceUrl: `http://localhost:${aliceConf.port}`,
    aliceMid: aliceConf.mid_b64,
    bobUrl: `http://localhost:${bobConf.port}`,
    bobMid: bobConf.mid_b64,
    pollInterval: 200,
}

describe("OWVerification end-to-end", () => {

    const alice = new IPv8Service(config.aliceUrl, config.pollInterval);
    const bob = new IPv8Service(config.bobUrl, config.pollInterval);
    alice.start();
    bob.start();

    const aliceRepo = mockRepo([]);

    const verifiee = new OWVerifiee(alice.verifieeService);
    const verifier = new OWVerifier(bob.verifierService);

    const vReq1: OWVerifyRequest = {
        ref: "abc",
        verifier_id: config.bobMid,
        attributes: [
            { ref: "x", name: "a1", format: "id_metadata", include_value: true },
            { ref: "y", name: "a2", format: "id_metadata", include_value: true }
        ],
    };

    before(async () => {
        const attributes = [
            { attribute_name: "a1", attribute_value: "v1" },
            { attribute_name: "a2", attribute_value: "v2" },
            { attribute_name: "a3", attribute_value: "v3" },
        ]

        const attested = await attest(bob.attesterService, alice.attesteeService, bobConf.mid_b64, aliceConf.mid_b64, attributes);

        attested.map(a => aliceRepo.put(a))
    })

    it("verifies based on an OW req/resp pair", async function () {

        const attrs = await aliceRepo.all();
        const a1 = attrs.find(a => a.name === "a1");
        const a2 = attrs.find(a => a.name === "a2");

        const vResp1: OWVerifyResponse = {
            ref: "abc",
            attributes: [
                { ref: "x", hash: a1.hash, value: a1.value },
                { ref: "y", hash: a2.hash, value: a2.value },
            ],
            subject_id: config.aliceMid,
            request_hash: "",
        };

        // Alice grants Verification to Bob
        verifiee.allowVerification(
            vReq1,
            Date.now() + 10000)

        // Bob requests verification
        const verification = await verifier.verify(vReq1, vResp1);

        expect(verification).to.equal(true);
    })

    it("Alice resolves the request properly", async function () {

        // Alice has a resolver
        const alicesResolver = new OWVerifyRequestResolver(config.aliceMid, aliceRepo);

        // Alice has a request handler
        const alicesHandler = new OWVerifyRequestHandler(alicesResolver, verifiee);

        // Alice consents to everything
        let vResponse;
        alicesHandler.setConsentCallback(async (result) => {
            vResponse = result.response;
            expect(!!vResponse).to.equal(true, "Expected a response to be generated");
            expect(result.status).to.equal("success", "Expected request to be resolved successfully");
            return true;
        })

        // Alice allows a request if it specifies this reference: abc
        alicesHandler.allowRef("abc");

        // Bob sends <OW:VerifyRequest> to Alice (via some transport)

        // Alice handles the request
        await alicesHandler.handleRequest(vReq1);

        // Alice sends <OW:VerifyResponse> to Bob (via some transport)

        // Bob validates the response
        const errors = verifier.validateResponse(vReq1, vResponse);
        expect(errors).to.deep.equal([], "Expected response validation to pass");

        // Bob requests verification
        const verification = await verifier.verify(vReq1, vResponse);

        expect(verification).to.equal(true);
    })

});

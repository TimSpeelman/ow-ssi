import fs from "fs";
import { Attestation } from "../../../src/ipv8/api/types";
import { IPv8Service } from "../../../src/ipv8/IPv8Service";
import { OWVerifyRequestHandler } from "../../../src/ow/OWVerifyRequestHandler";
import { OWVerifiee } from "../../../src/ow/protocol/OWVerifiee";
import { OWVerifier } from "../../../src/ow/protocol/OWVerifier";
import { OWVerifyRequestResolver } from "../../../src/ow/resolution/OWVerifyRequestResolver";
import { OWVerifyRequest, OWVerifyResponse } from "../../../src/ow/types";
import { before, describe, expect, it } from "../../tools";
import { mockRepo } from "../mockRepo";

const prefix = "ow-verif-";

const aliceConf = JSON.parse(fs.readFileSync('temp/test-alice/config.json', { encoding: 'utf8' }))
// const bobConf = JSON.parse(fs.readFileSync('temp/server-brp/config.json', { encoding: 'utf8' }))
const bobConf = JSON.parse(fs.readFileSync('temp/test-bob/config.json', { encoding: 'utf8' }))

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

    const verifiee = new OWVerifiee(alice.verifieeService);
    const verifier = new OWVerifier(bob.verifierService);

    const vReq1: OWVerifyRequest = {
        ref: "abc",
        verifier_id: config.bobMid,
        attributes: [
            { ref: "x", name: prefix + "a1", format: "id_metadata", include_value: true },
            { ref: "y", name: prefix + "a2", format: "id_metadata", include_value: true }
        ],
    };

    let att1: Attestation;
    let att2: Attestation;
    let att3: Attestation;

    before(async () => {
        // Prepare by attesting to Alice
        att1 = await attestToAlice(prefix + "a1", "val1");
        att2 = await attestToAlice(prefix + "a2", "val2");
        att3 = await attestToAlice(prefix + "a3", "val3");
    })

    it("verifies based on an OW req/resp pair", async function () {

        const vResp1: OWVerifyResponse = {
            ref: "abc",
            attributes: [
                { ref: "x", hash: att1.attribute_hash, value: "val1" },
                { ref: "y", hash: att2.attribute_hash, value: "val2" },
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
        // Alice has a repository with three attributes
        const repo = mockRepo([
            { name: prefix + "a1", value: "val1", format: "id_metadata", hash: att1.attribute_hash, metadata: null, signer_mid_b64: "" },
            { name: prefix + "a2", value: "val2", format: "id_metadata", hash: att2.attribute_hash, metadata: null, signer_mid_b64: "" },
            { name: prefix + "a3", value: "val3", format: "id_metadata", hash: att3.attribute_hash, metadata: null, signer_mid_b64: "" },
        ]);

        // Alice has a resolver
        const alicesResolver = new OWVerifyRequestResolver(config.aliceMid, repo);

        // Alice has a request handler
        const alicesHandler = new OWVerifyRequestHandler(alicesResolver, verifiee);

        // Alice consents to everything
        let response;
        alicesHandler.setConsentCallback(async (result) => {
            response = result.response;
            expect(!!response).to.equal(true, "Expected a response to be generated");
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
        const errors = verifier.validateResponse(vReq1, response);
        expect(errors).to.deep.equal([], "Expected response validation to pass");

        // Bob requests verification
        const verification = await verifier.verify(vReq1, response);

        expect(verification).to.equal(true);
    })

    /** Lets Bob attest to Alice */
    async function attestToAlice(name: string, value: string): Promise<Attestation> {
        bob.attesterService.stageAttestation(config.aliceMid, [{ attribute_name: name, attribute_value: value }], Date.now() + 10000)
        return alice.attesteeService.requestAttestation(config.bobMid, [{ attribute_name: name, id_format: "id_metadata" }])
            .then(attestations => attestations[0]);
    }

});
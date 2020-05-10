import Axios from "axios";
import { VerifyHttpClient } from "../../../src/auth/HttpClient";
import { VerifyHttpServer } from "../../../src/auth/HttpServer";
import { Attestation } from "../../../src/ipv8/api/types";
import { IPv8Service } from "../../../src/ipv8/IPv8Service";
import { OWVerifiee } from "../../../src/ow/protocol/OWVerifiee";
import { OWVerifier } from "../../../src/ow/protocol/OWVerifier";
import { OWVerifyRequest } from "../../../src/ow/protocol/types";
import { OWVerifyRequestResolver } from "../../../src/ow/resolution/OWVerifyRequestResolver";
import { loadTemporaryIPv8Configuration } from "../../../src/util/ipv8conf";
import { mockRepo } from "../../ow/mockRepo";
import { before, describe, expect, it } from "../../tools";

const prefix = "ow-authserver-";

const aliceConf = loadTemporaryIPv8Configuration('test-alice')
const bobConf = loadTemporaryIPv8Configuration('test-bob')

const config = {
    aliceUrl: `http://localhost:${aliceConf.port}`,
    aliceMid: aliceConf.mid_b64,
    bobUrl: `http://localhost:${bobConf.port}`,
    bobMid: bobConf.mid_b64,
    pollInterval: 200,
    serverPort: 9200,
}

describe("OWVerifyServer end-to-end", () => {

    const alice = new IPv8Service(config.aliceUrl, config.pollInterval);
    const bob = new IPv8Service(config.bobUrl, config.pollInterval);
    alice.start();
    bob.start();

    let att1: Attestation;
    let att2: Attestation;
    let att3: Attestation;

    before(async () => {
        // Prepare by attesting to Alice
        att1 = await attestToAlice(prefix + "a1", "val1");
        att2 = await attestToAlice(prefix + "a2", "val2");
        att3 = await attestToAlice(prefix + "a3", "val3");
    })

    const loginRequest: OWVerifyRequest = {
        ref: "abc",
        verifier_id: config.bobMid,
        attributes: [
            { ref: "x", name: prefix + "a1", format: "id_metadata", include_value: true },
            { ref: "y", name: prefix + "a2", format: "id_metadata", include_value: true }
        ],
    };

    const templates = {
        login: loginRequest
    }

    const verifiee = new OWVerifiee(alice.verifieeService);
    const verifier = new OWVerifier(bob.verifierService);

    const server = new VerifyHttpServer(
        templates,
        config.serverPort,
        verifier
    );
    const serverUrl = `http://localhost:${config.serverPort}`;

    server.start();

    const client = new VerifyHttpClient(verifiee);

    it("verifies", async function () {
        // Alice has a repository with three attributes
        const repo = mockRepo([
            { name: prefix + "a1", value: "val1", format: "id_metadata", hash: att1.attribute_hash, metadata: null, signer_mid_b64: "" },
            { name: prefix + "a2", value: "val2", format: "id_metadata", hash: att2.attribute_hash, metadata: null, signer_mid_b64: "" },
            { name: prefix + "a3", value: "val3", format: "id_metadata", hash: att3.attribute_hash, metadata: null, signer_mid_b64: "" },
        ]);

        // Alice has a resolver
        const alicesResolver = new OWVerifyRequestResolver(config.aliceMid, repo);

        // Alice scans a QR from a portal
        const ref = await Axios.get(serverUrl + "/referToVerifyRequest?template=login").then(res => res.data);
        const refData = ref.data;

        // The Wallet retrieves the request
        const request = await client.getVerifyRequest(refData.url + "/getVerifyRequest?uuid=" + refData.uuid); // todo: put uuid in url

        // Alice handles the request
        const resolveResult = await alicesResolver.resolveRequest(request);

        // Allow verification and submit response
        // const validUntil = Date.now() + 10000
        // verifiee.allowVerification(request, validUntil);

        // Verification should complete
        await client.verifyMe(refData.uuid, request, resolveResult.response);

        await new Promise((r) => setTimeout(r, 2000));

        // The web portal receives the result
        const verifyResult = await Axios.get(serverUrl + "/result?uuid=" + refData.uuid).then(res => res.data);

        expect(verifyResult).to.have.property("result")
        expect(verifyResult.result).to.have.property("success", true)

    })

    async function attestToAlice(name: string, value: string): Promise<Attestation> {
        bob.attesterService.stageAttestation(config.aliceMid, [{ attribute_name: name, attribute_value: value }], Date.now() + 10000)
        return alice.attesteeService.requestAttestation(config.bobMid, [{ attribute_name: name, id_format: "id_metadata" }])
            .then(attestations => attestations[0]);
    }

});
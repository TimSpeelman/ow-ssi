import fs from "fs";
import { IPv8Service } from "../../../src/ipv8/IPv8Service";
import { describe, expect, it } from "../../tools";

const aliceConf = JSON.parse(fs.readFileSync('temp/test-alice/config.json', { encoding: 'utf8' }))
const chrisConf = JSON.parse(fs.readFileSync('temp/test-bob/config.json', { encoding: 'utf8' }))

const config = {
    aliceUrl: `http://localhost:${aliceConf.port}`,
    aliceMid: aliceConf.mid_b64,
    chrisUrl: `http://localhost:${chrisConf.port}`,
    chrisMid: chrisConf.mid_b64,
    pollInterval: 200,
}

describe("IPv8Service e2e Attestation", () => {

    const alice = new IPv8Service(config.aliceUrl, config.pollInterval);
    const chris = new IPv8Service(config.chrisUrl, config.pollInterval);
    alice.start();
    chris.start();

    it("attestation staging works", async function () {
        // Chris grants attestation to Alice
        chris.attesterService.stageAttestation(
            config.aliceMid,
            [{ attribute_name: "attr1", attribute_value: "val1" }],
            Date.now() + 10000)

        // Alice requests attestation by Chris
        const attestations = await alice.attesteeService.requestAttestation(
            config.chrisMid,
            [{ attribute_name: "attr1", id_format: "id_metadata" }]);

        expect(attestations).to.have.length(1);
        expect(attestations[0]).to.have.property("attribute_name", "attr1")
        expect(attestations[0]).to.have.property("signer_mid_b64", config.chrisMid)
    })

    it("unstaged attestation works", async function () {
        // Chris will only attest to 'attr2' requests
        chris.attesterService.onNonStagedRequest((aReq) => {
            if (aReq.attribute_name === "attr2") {
                return Promise.resolve({ attribute_name: "attr2", attribute_value: "val2" })
            }
        })

        // Alice requests attestation by Chris
        const attestations = await alice.attesteeService.requestAttestation(
            config.chrisMid,
            [{ attribute_name: "attr2", id_format: "id_metadata" }]);

        expect(attestations).to.have.length(1);
        expect(attestations[0]).to.have.property("attribute_name", "attr2")
        expect(attestations[0]).to.have.property("signer_mid_b64", config.chrisMid)
    })

    // it("self-verification works", async function () {
    //     // Alice will only attest to 'attr4' requests
    //     alice.attesterService.stageAttestation(config.aliceMid,
    //         { attribute_name: "selfatt", attribute_value: "valx" }, Date.now() + 10000);

    //     // Alice requests attestation by itself
    //     const attestations = await alice.attesteeService.requestAttestation(
    //         config.aliceMid,
    //         [{ attribute_name: "selfatt", id_format: "id_metadata" }]);

    //     expect(attestations).to.have.length(1);
    //     expect(attestations[0]).to.have.property("attribute_name", "selfatt")
    //     expect(attestations[0]).to.have.property("signer_mid_b64", config.chrisMid)
    // })

});
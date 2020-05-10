import { Attestation } from "../../../src/ipv8/api/types";
import { IPv8Service } from "../../../src/ipv8/IPv8Service";
import { loadTemporaryIPv8Configuration } from "../../../src/util/ipv8conf";
import { describe, expect, it } from "../../tools";

const aliceConf = loadTemporaryIPv8Configuration('test-alice');
const bobConf = loadTemporaryIPv8Configuration('test-bob');

const config = {
    aliceUrl: `http://localhost:${aliceConf.port}`,
    aliceMid: aliceConf.mid_b64,
    bobUrl: `http://localhost:${bobConf.port}`,
    bobMid: bobConf.mid_b64,
    pollInterval: 200,
}

describe("IPv8Service e2e Verification", () => {

    const alice = new IPv8Service(config.aliceUrl, config.pollInterval);
    const bob = new IPv8Service(config.bobUrl, config.pollInterval);
    alice.start();
    bob.start();

    it("verification staging works", async function () {
        // Prepare by attesting to Alice
        const attestation = await attestToAlice("attr3", "val3");

        // Alice grants Verification to Bob
        alice.verifieeService.stageVerification(
            config.bobMid,
            ["attr3"],
            Date.now() + 10000)

        // Bob requests verification
        const verification = await bob.verifierService.verify(
            config.aliceMid,
            [{
                attribute_hash: attestation.attribute_hash,
                attribute_name: "attr3",
                attribute_value: "val3"
            }]);

        expect(verification).to.equal(true);
    })

    it("unstaged verification works", async function () {
        // Prepare by attesting to Alice
        const attestation = await attestToAlice("attr4", "val4");

        // Alice will only allow attr4 requests
        alice.verifieeService.onNonStagedRequest((vReq) => {
            if (vReq.attribute_name === "attr4") return Promise.resolve(true);
        })

        // Bob requests verification
        const verification = await bob.verifierService.verify(
            config.aliceMid,
            [{
                attribute_hash: attestation.attribute_hash,
                attribute_name: "attr4",
                attribute_value: "val4"
            }]);

        expect(verification).to.equal(true);
    })

    // it("self-verification works", async function () {
    //     // Prepare by attesting to Alice
    //     const attestation = await attestToAlice("attr3", "val3");

    //     // Alice will only attest to 'attr4' requests
    //     alice.verifieeService.stageVerification(config.aliceMid,
    //         ["attr3"], Date.now() + 10000);

    //     // Alice requests verification of itself
    //     const verification = await alice.verifierService.verify(
    //         config.aliceMid,
    //         [{
    //             attribute_name: "attr3",
    //             attribute_hash: attestation.attribute_hash,
    //             attribute_value: "val3"
    //         }]);

    //     expect(verification).to.equal(true);
    // })

    /** Lets Bob attest to Alice */
    async function attestToAlice(name: string, value: string): Promise<Attestation> {
        bob.attesterService.stageAttestation(config.aliceMid, [{ attribute_name: name, attribute_value: value }], Date.now() + 10000)
        return alice.attesteeService.requestAttestation(config.bobMid, [{ attribute_name: name, id_format: "id_metadata" }])
            .then(attestations => attestations[0]);
    }

});
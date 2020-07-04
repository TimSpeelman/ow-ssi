import { IPv8Service } from "../../../src/ipv8/IPv8Service";
import { OWAttestee } from "../../../src/ow/protocol/OWAttestee";
import { OWAttester } from "../../../src/ow/protocol/OWAttester";
import { OWAttestOffer } from "../../../src/ow/protocol/types";
import { loadTemporaryIPv8Configuration } from "../../../src/util/ipv8conf";
// import { describe, expect } from "../../tools";

const aliceConf = loadTemporaryIPv8Configuration('test-alice');
const chrisConf = loadTemporaryIPv8Configuration('test-bob');

const config = {
    aliceUrl: `http://localhost:${aliceConf.port}`,
    aliceMid: aliceConf.mid_b64,
    chrisUrl: `http://localhost:${chrisConf.port}`,
    chrisMid: chrisConf.mid_b64,
    pollInterval: 200,
}

describe("OWAttestation end-to-end", () => {

    const alice = new IPv8Service(config.aliceUrl, config.pollInterval);
    const chris = new IPv8Service(config.chrisUrl, config.pollInterval);
    alice.start();
    chris.start();

    const attestee = new OWAttestee(alice.attesteeService);
    const attester = new OWAttester(chris.attesterService);

    test("attests based on an OW req/resp pair", async function () {

        // Chris creates an Attestation Offer
        const offer: OWAttestOffer = {
            ref: "FIXME",
            attester_id: config.chrisMid,
            attributes: [
                { name: "a1", format: "id_metadata", value: "v1" },
                { name: "a2", format: "id_metadata", value: "v2" },
            ],
            expiresAtTimeInMillis: 1,
            subject_id: config.aliceMid,
        }

        // Chris stages his offer
        attester.attestByOffer(offer);

        // Chris sends <OW:AttestOffer> to Alice (via some transport)

        // Alice handles the offer by requesting IPv8 attestation
        const results = await attestee.requestAttestationByOffer(offer);

        expect(results).toHaveLength(2) // Expected two attestations
        expect(results[0].name).toEqual("a1");
        expect(results[1].name).toEqual("a2");

    })

});
import fs from "fs";
import { IPv8Service } from "../../../src/ipv8/IPv8Service";
import { OWAttesteeService } from "../../../src/ow/OWAttesteeService";
import { OWAttesterService } from "../../../src/ow/OWAttesterService";
import { OWAttestOffer } from "../../../src/ow/types";
import { describe, expect, it } from "../../tools";

const prefix = "ow-verif-";

const aliceConf = JSON.parse(fs.readFileSync('temp/server-kvk/config.json', { encoding: 'utf8' }))
const chrisConf = JSON.parse(fs.readFileSync('temp/client/config.json', { encoding: 'utf8' }))

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

    const attestee = new OWAttesteeService(alice.attesteeService);
    const attester = new OWAttesterService(chris.attesterService);

    it("attests based on an OW req/resp pair", async function () {

        // Alice will accept any offer
        attestee.setConsentCallback(async (offer) => true);

        // Alice creates a reference for Chris (to pass the spam filter)
        const allowedReference = "abc";
        attestee.allowRef(allowedReference);

        // Chris creates an Attestation Offer
        const offer: OWAttestOffer = {
            ref: allowedReference,
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
        const results = await attestee.handleOffer(offer);

        expect(results).to.have.length(2, "Expected two attestations");
        expect(results[0].name).to.equal("a1");
        expect(results[1].name).to.equal("a2");

    })

});
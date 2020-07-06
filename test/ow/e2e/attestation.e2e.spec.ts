import { OWAgent } from "../../../src/ow/OWAgent";
import { OWAttestOffer } from "../../../src/ow/protocol/types";
import { describe, expect, it } from "../../tools";

const alicePort = 10001;
const chrisPort = 10002;

describe("OWAttestation end-to-end", function () {

    const alice = new OWAgent(`http://localhost:${alicePort}`);
    const chris = new OWAgent(`http://localhost:${chrisPort}`);

    this.beforeAll(async function () {
        await alice.start(500);
        await chris.start(500);
    })

    it("attests based on an OW req/resp pair", function (done) {

        // Chris creates an Attestation Offer
        const offer: OWAttestOffer = {
            ref: "FIXME",
            attester_id: chris.mid,
            attributes: [
                { name: "a1", format: "id_metadata", value: "v1" },
                { name: "a2", format: "id_metadata", value: "v2" },
            ],
            expiresAtTimeInMillis: 1,
            subject_id: alice.mid,
        }

        // Chris stages his offer
        chris.attester.attestByOffer(offer).catch(done);

        // Chris sends <OW:AttestOffer> to Alice (via some transport)

        // Alice handles the offer by requesting IPv8 attestation
        alice.attestee.requestAttestationByOffer(offer).then((results) => {
            expect(results).to.have.length(2, "Expected two attestations");
            expect(results[0].name).to.equal("a1");
            expect(results[1].name).to.equal("a2");
            done();
        }).catch(done)

    })

});
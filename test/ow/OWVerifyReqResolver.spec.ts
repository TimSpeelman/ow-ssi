
import { OWVerifyRequestResolver } from "../../src/ow/OWVerifyRequestResolver";
import { OWVerifyRequest } from "../../src/ow/types";
import { describe, expect, it } from "../tools";
import { mockRepo } from "./mockRepo";

describe("OWVerifyReqResolver", () => {

    it("returns a valid response", async function () {
        // The Subject's attestations:
        const repo = mockRepo([
            { name: "a1", value: "v1", format: "id_metadata", hash: "hash1", metadata: null, signer_mid_b64: "" },
            { name: "a2", value: "v2", format: "id_metadata", hash: "hash2", metadata: null, signer_mid_b64: "" },
        ]);

        // A verification request comes in
        const vReq: OWVerifyRequest = {
            ref: "abc",
            verifier_id: "",
            attributes: [
                { ref: "x", name: "a1", format: "id_metadata", include_value: true },
                { ref: "y", name: "a2", format: "id_metadata" },
            ],
        };

        const resolver = new OWVerifyRequestResolver("myId", repo);
        const result = await resolver.resolveRequest(vReq);
        const response = result.response;

        expect(!!response).to.equal(true, "Response should not be undefined");

        expect(response.ref).to.equal("abc", "Response should include the reference");
        expect(response.subject_id).to.equal("myId", "Response should include subject ID");
        expect(response.attributes).to.have.length(2, "Response should include two attributes");

        expect(response.attributes[0].ref).to.equal("x", "Response Attr should include proper reference");
        expect(response.attributes[0].hash).to.equal("hash1", "Response Attr should include proper attribute hash");
        expect(response.attributes[0].value).to.equal("v1", "Response should include value if requested");

        expect(response.attributes[1].ref).to.equal("y", "Response Attr should include proper reference");
        expect(response.attributes[1].hash).to.equal("hash2", "Response should include proper attribute hash");
        expect(response.attributes[1]).to.not.have.property("value", null, "Response should not include value if not requested");
    })

    it("correctly resolves if possible unambiguously", async function () {

        const vReq: OWVerifyRequest = {
            ref: "abc",
            verifier_id: "",
            attributes: [
                { ref: "x", name: "a1", format: "id_metadata", include_value: true },
            ],
        };

        const repo = mockRepo([
            { name: "a1", value: "v1", format: "id_metadata", hash: "hash1", metadata: null, signer_mid_b64: "" },
            { name: "other", value: "v2", format: "id_metadata", hash: "hash2", metadata: null, signer_mid_b64: "" },
        ]);
        const resolver = new OWVerifyRequestResolver("myId", repo);
        const result = await resolver.resolveRequest(vReq);

        expect(result.status).to.equal("success");
        expect(result.response.attributes).to.have.length(1);
        expect(result.response.attributes[0]).to.deep.equal({
            value: "v1",
            hash: "hash1",
            ref: "x",
        })
    });

    it("shows multiple options", async function () {
        const vReq: OWVerifyRequest = {
            ref: "abc",
            attributes: [
                { ref: "x", name: "a1", format: "id_metadata", include_value: true },
            ],
        };

        const repo = mockRepo([
            { name: "a1", value: "v1", format: "id_metadata", hash: "hash1", metadata: null, signer_mid_b64: "" },
            { name: "a1", value: "v2", format: "id_metadata", hash: "hash2", metadata: null, signer_mid_b64: "" },
        ]);
        const resolver = new OWVerifyRequestResolver("myId", repo);
        const result = await resolver.resolveRequest(vReq);

        expect(result.status).to.equal("unresolved");
        expect(result.response.attributes).to.have.length(1);
        expect(result.response.attributes[0]).to.deep.equal({
            value: "v1",
            hash: "hash1",
            ref: "x",
        })
        expect(result.attributes[0].status).to.equal("ambiguous");
        expect(result.attributes[0].results).to.have.length(2);
    })

});

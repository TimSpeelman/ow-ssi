
import { OWVerifyRequest } from "../../src/ow/protocol/types";
import { OWVerifyRequestResolver } from "../../src/ow/resolution/OWVerifyRequestResolver";
// import { describe, expect } from "../tools";
import { mockRepo } from "./mockRepo";

describe("OWVerifyReqResolver", () => {

    test("returns a valid response", async function () {
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

        expect(!!response).toEqual(true) // Response should not be undefined

        expect(response.ref).toEqual("abc") // Response should include the reference
        expect(response.subject_id).toEqual("myId") // Response should include subject ID
        expect(response.attributes).toHaveLength(2) // Response should include two attributes

        expect(response.attributes[0].ref).toEqual("x") // Response Attr should include proper reference
        expect(response.attributes[0].hash).toEqual("hash1") // Response Attr should include proper attribute hash
        expect(response.attributes[0].value).toEqual("v1") // Response should include value if requested

        expect(response.attributes[1].ref).toEqual("y") // Response Attr should include proper reference
        expect(response.attributes[1].hash).toEqual("hash2") // Response should include proper attribute hash
        expect(response.attributes[1]).not.toHaveProperty("value", null) // Response should not include value if not requested
    })

    test("correctly resolves if possible unambiguously", async function () {

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

        expect(result.status).toEqual("success");
        expect(result.response.attributes).toHaveLength(1);
        expect(result.response.attributes[0]).toEqual({
            value: "v1",
            hash: "hash1",
            ref: "x",
        })
    });

    test("shows multiple options", async function () {
        const vReq: OWVerifyRequest = {
            verifier_id: "",
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

        expect(result.status).toEqual("unresolved");
        expect(result.response.attributes).toHaveLength(1);
        expect(result.response.attributes[0]).toEqual({
            value: "v1",
            hash: "hash1",
            ref: "x",
        })
        expect(result.attributes[0].status).toEqual("ambiguous");
        expect(result.attributes[0].results).toHaveLength(2);
    })

});

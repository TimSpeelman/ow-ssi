import { IPv8Service } from "../../../src/ipv8/IPv8Service";
import { OWAttestee } from "../../../src/ow/protocol/OWAttestee";
import { OWVerifiee } from "../../../src/ow/protocol/OWVerifiee";
import { OWVerifyResponse } from "../../../src/ow/protocol/types";
import { RecipeClient } from "../../../src/recipe/RecipeClient";
import { RecipeConfiguration, RecipeServer } from "../../../src/recipe/RecipeServer";
import { loadTemporaryIPv8Configuration } from "../../../src/util/ipv8conf";
import { attest } from "../../ipv8/attest";
import { describe, expect, it } from "../../tools";


const serverConf = loadTemporaryIPv8Configuration("test-bob")
export const serverPeer = {
    ipv8_url: `http://localhost:${serverConf.port}`,
    rest_port: 9100,
    mid_b64: serverConf.mid_b64,
}

const clientConf = loadTemporaryIPv8Configuration("test-alice")
export const clientPeer = {
    ipv8_url: `http://localhost:${clientConf.port}`,
    mid_b64: clientConf.mid_b64,
}

const ATT_ZERO = "att0";
const ATT_ZERO_VAL = "2168897456";
const ATT_ONE = "att1";
const ATT_ONE_VAL = "att1val";

const recipe0: RecipeConfiguration = {
    recipe: {
        name: "recipe0",
        title: {},
        service_endpoint: "",
        attributes: [{
            name: ATT_ZERO,
            format: "id_metadata",
            title: {},
        }],
    },
    resolver: () => Promise.resolve([{
        attribute_name: ATT_ZERO,
        attribute_value: ATT_ZERO_VAL, // arr.shift(),
    }]),
}

const recipe1: RecipeConfiguration = {
    recipe: {
        name: "recipe1",
        title: {},
        service_endpoint: "",
        attributes: [{
            name: ATT_ONE,
            format: "id_metadata",
            title: {},
        }],
        verify_request: {
            verifier_id: serverPeer.mid_b64, // FIXME
            attributes: [
                { name: ATT_ZERO, ref: ATT_ZERO, format: "id_metadata", include_value: true }
            ],

        }
    },
    resolver: () => Promise.resolve([{
        attribute_name: ATT_ONE,
        attribute_value: ATT_ONE_VAL, // arr.shift(),
    }]),
}

const recipes = {
    recipe0,
    recipe1,
};

const serverId = {
    http_address: "http://localhost:" + serverPeer.rest_port,
    mid_b64: serverPeer.mid_b64,
};

describe("Recipe Service Attestation", function () {

    let serverIPv8: IPv8Service;
    let clientIPv8: IPv8Service;

    this.beforeEach(() => {
        serverIPv8 = new IPv8Service(serverPeer.ipv8_url).start();
        clientIPv8 = new IPv8Service(clientPeer.ipv8_url).start();
    })

    this.afterEach(() => {
        serverIPv8.stop();
        clientIPv8.stop();
    })

    it("attests without verification", async function () {

        const server = new RecipeServer(serverPeer.mid_b64, serverIPv8, recipes);

        const verifiee = new OWVerifiee(clientIPv8.verifieeService);
        const attestee = new OWAttestee(clientIPv8.attesteeService);
        const client = new RecipeClient(clientPeer.mid_b64, verifiee, attestee);

        const process = client.createProcess(recipe0.recipe);
        const request = process.createRequest();

        const offer = await server.executeRecipe(request);

        const errors = process.validateOffer(offer);
        expect(errors).to.deep.equal([], "Expected offer to pass validation");

        const data = await process.requestAttestation(offer);

        expect(data).to.be.an("array");
        expect(data).to.have.length(1);
        expect(data[0]).to.deep.property("name", ATT_ZERO);
        expect(data[0]).to.have.property("value", ATT_ZERO_VAL);
    });


    it("attests with verification", async function () {

        const server = new RecipeServer(serverPeer.mid_b64, serverIPv8, recipes);

        const verifiee = new OWVerifiee(clientIPv8.verifieeService);
        const attestee = new OWAttestee(clientIPv8.attesteeService);
        const client = new RecipeClient(clientPeer.mid_b64, verifiee, attestee);

        // Provide the client with the required attribute
        const attributes = await attest(
            serverIPv8.attesterService,
            clientIPv8.attesteeService,
            serverPeer.mid_b64,
            clientPeer.mid_b64,
            [{ attribute_name: ATT_ZERO, attribute_value: ATT_ZERO_VAL }]
        );

        // Create the verification response
        const response: OWVerifyResponse = {
            attributes: [{ hash: attributes[0].hash, ref: ATT_ZERO, value: attributes[0].value }],
            request_hash: "",
            subject_id: clientPeer.mid_b64,
        }

        const process = client.createProcess(recipe1.recipe);

        // Create the RecipeRequest, passing the VerifyResponse
        const request = process.createRequest(response);

        process.allowVerification(response).catch(console.log);

        const offer = await server.executeRecipe(request);

        const errors = process.validateOffer(offer);
        expect(errors).to.deep.equal([], "Expected offer to pass validation");

        const data = await process.requestAttestation(offer);

        expect(data).to.be.an("array");
        expect(data).to.have.length(1);
        expect(data[0]).to.deep.property("name", ATT_ONE);
        expect(data[0]).to.have.property("value", ATT_ONE_VAL);
    });


});


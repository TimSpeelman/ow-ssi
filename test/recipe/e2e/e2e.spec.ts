import { IPv8Service } from "../../../src/ipv8/IPv8Service";
import { OWAttestee } from "../../../src/ow/protocol/OWAttestee";
import { OWVerifiee } from "../../../src/ow/protocol/OWVerifiee";
import { RecipeClient } from "../../../src/recipe/RecipeClient";
import { RecipeConfiguration, RecipeServer } from "../../../src/recipe/RecipeServer";
import { RecipeRequest } from "../../../src/recipe/types";
import { loadTemporaryIPv8Configuration } from "../../../src/util/ipv8conf";
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
        attributes: [{
            name: ATT_ONE,
            format: "id_metadata",
            title: {},
        }],
        verify_request: {
            verifier_id: "", // FIXME
            attributes: [
                { name: ATT_ZERO, ref: ATT_ZERO, format: "id_metadata", include_value: true }
            ],

        }
    },
    resolver: () => Promise.resolve([{
        attribute_name: ATT_ZERO,
        attribute_value: ATT_ZERO_VAL, // arr.shift(),
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

describe("Client-Server Attestation including credential verification", function () {

    let server: RecipeServer;
    let client: RecipeClient;

    it("attests if verification succeeds", async function () {

        const serverIPv8 = new IPv8Service(serverPeer.ipv8_url);
        const server = new RecipeServer(serverPeer.mid_b64, serverIPv8, recipes);

        const connection = {
            send: (m: RecipeRequest) => server.executeRecipe(m)
        }

        const clientIPv8 = new IPv8Service(clientPeer.ipv8_url);
        const verifiee = new OWVerifiee(clientIPv8.verifieeService);
        const attestee = new OWAttestee(clientIPv8.attesteeService);
        const client = new RecipeClient(clientPeer.mid_b64, verifiee, attestee, connection);

        serverIPv8.start();
        clientIPv8.start();
        // await setupAttestationZero(client, server, myAttrs);

        const data = await client.requestRecipe(recipe0.recipe);

        expect(data).to.be.an("array");
        expect(data).to.have.length(1);
        expect(data[0]).to.deep.property("name", ATT_ZERO);
        expect(data[0]).to.have.property("value", ATT_ZERO_VAL);
    });

});

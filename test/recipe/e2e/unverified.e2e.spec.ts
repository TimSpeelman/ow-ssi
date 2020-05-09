import { Attribute } from "../../../src/ipv8/services/types/Attribute";
import { AttestationClient } from "../../../src/recipe/client/AttestationClient";
import { AttestationClientFactory } from "../../../src/recipe/client/AttestationClientFactory";
import { AttestationServer } from "../../../src/recipe/server/AttestationServer";
import { Dict } from "../../../src/types/Dict";
import { ClientProcedure, ProcedureConfig } from "../../../src/types/types";
import { loadTemporaryIPv8Configuration } from "../../../src/util/ipv8conf";
import { mapValues } from "../../../src/util/mapValues";
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
const ATT_ZERO_VAL = "att0val";

const config = {
    procedureZero: {
        procedure_name: "procedureZero",
        attributes: [{ name: ATT_ZERO, type: "id_metadata", title: {} }],
        requirements: [] as string[],
        title: {},
    },
    zeroResolver: () => Promise.resolve([{
        attribute_name: ATT_ZERO,
        attribute_value: ATT_ZERO_VAL,
    }]),
};

describe("Basic Client-Server Attestation without verification", function () {

    let server: AttestationServer;
    let client: AttestationClient;

    this.afterEach(() => {
        if (server) { server.stop(); }
        server = null;
        if (client) { client.stop(); }
        client = null;
    })

    it("attests without verification if not required", async function () {
        server = mockAttestationServer();
        await server.start();
        client = mockAttestationClient();
        const procedure: ClientProcedure = {
            server: {
                http_address: "http://localhost:" + serverPeer.rest_port,
                mid_b64: serverPeer.mid_b64,
            },
            desc: config.procedureZero,
        };
        const myAttrs = {};
        const { data, attestations } = await executeProcedureFromClient(client, procedure, myAttrs);
        expect(data).to.be.an("array");
        expect(data).to.have.length(1);
        expect(data[0]).to.deep.property("attribute_name", ATT_ZERO);
        expect(data[0]).to.have.property("attribute_value", ATT_ZERO_VAL);

        expect(attestations).to.be.an("array");
        expect(attestations).to.have.length(1);
        expect(attestations[0]).to.have.property("attribute_name", ATT_ZERO);
        expect(attestations[0]).to.have.property("signer_mid_b64", serverPeer.mid_b64);
        console.log(attestations[0]);
    });

});

function mockAttestationClient() {
    const { ipv8_url, mid_b64 } = clientPeer;
    const factory = new AttestationClientFactory({ ipv8_url, mid_b64 });
    return factory.create();
}

function executeProcedureFromClient(
    attClient: AttestationClient,
    procedure: ClientProcedure,
    clientAttributeStore: Dict<any>
) {
    return attClient.execute(procedure, clientAttributeStore)
        .then(({ data, attestations }) => {
            data.forEach((attr: Attribute) => {
                // @ts-ignore
                clientAttributeStore[attr.attribute_name] = attr.attribute_value;
            });
            return { data, attestations };
        });
}

function mockAttestationServer() {
    const procedures: Dict<ProcedureConfig> = {
        procedureZero: {
            desc: config.procedureZero,
            resolver: config.zeroResolver,
        },
    };
    const options = {
        ipv8_url: serverPeer.ipv8_url,
        http_port: serverPeer.rest_port,
        mid_b64: serverPeer.mid_b64,
    };
    const desc = {
        id: "brp",
        url: "",
        logo_url: "",
        mid_b64: serverPeer.mid_b64,
        title: {},
        description: {},
        website: "",
        procedures: mapValues(procedures, (e) => e.desc),
    }
    return new AttestationServer(procedures, desc, options);
}


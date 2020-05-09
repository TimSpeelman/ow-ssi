import { Attribute } from "../../../src/ipv8/services/types/Attribute";
import { OWVerifyRequestResolver } from "../../../src/ow/resolution/OWVerifyRequestResolver";
import { IVerifyRequestResolver } from "../../../src/ow/resolution/types";
import { AttestationClient } from "../../../src/recipe/client/AttestationClient";
import { AttestationClientFactory } from "../../../src/recipe/client/AttestationClientFactory";
import { AttestationServer } from "../../../src/recipe/server/AttestationServer";
import { Dict } from "../../../src/types/Dict";
import { ClientProcedure, ProcedureConfig } from "../../../src/types/types";
import { loadTemporaryIPv8Configuration } from "../../../src/util/ipv8conf";
import { mapValues } from "../../../src/util/mapValues";
import { mockRepo } from "../../ow/mockRepo";
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

const config = {
    procedureZero: {
        procedure_name: "procedureZero",
        attributes: [{
            name: ATT_ZERO,
            type: "id_metadata",
            title: {},
        }],
        requirements: [] as string[],
        title: {},
    },
    zeroResolver: () => Promise.resolve([{
        attribute_name: ATT_ZERO,
        attribute_value: ATT_ZERO_VAL, // arr.shift(),
    }]),
    procedureOne: {
        procedure_name: "procedureOne",
        attributes: [{
            name: ATT_ONE,
            type: "id_metadata",
            title: {},
        }],
        requirements: [ATT_ZERO] as string[],
        title: {},
    },
    OneResolver: () => Promise.resolve([{
        attribute_name: ATT_ONE,
        attribute_value: ATT_ONE_VAL,
    }]),
};


const serverId = {
    http_address: "http://localhost:" + serverPeer.rest_port,
    mid_b64: serverPeer.mid_b64,
};

describe("Client-Server Attestation including credential verification", function () {

    let server: AttestationServer;
    let client: AttestationClient;

    this.afterEach(() => {
        server && server.stop();
        server = null;
        client && client.stop();
        client = null;
    })

    it("attests if verification succeeds", async function () {
        server = mockAttestationServer();
        await server.start();

        const repo = mockRepo([

        ])
        const resolver = new OWVerifyRequestResolver(clientPeer.mid_b64, repo)

        client = mockAttestationClient(resolver);
        const myAttrs = {};

        await setupAttestationZero(client, server, myAttrs);

        const procedure: ClientProcedure = {
            server: serverId,
            desc: config.procedureOne,
        };
        const { data, attestations } = await executeProcedureFromClient(client, procedure, myAttrs);
        expect(data).to.be.an("array");
        expect(data).to.have.length(1);
        expect(data[0]).to.deep.property("attribute_name", ATT_ONE);
        expect(data[0]).to.have.property("attribute_value", ATT_ONE_VAL);

        expect(attestations).to.be.an("array");
        expect(attestations).to.have.length(1);
        expect(attestations[0]).to.have.property("attribute_name", ATT_ONE);
        expect(attestations[0]).to.have.property("signer_mid_b64", serverPeer.mid_b64);
        console.log(attestations[0]);
    });

});


function mockAttestationClient(resolver: IVerifyRequestResolver) {
    const { ipv8_url, mid_b64 } = clientPeer;
    const factory = new AttestationClientFactory({ ipv8_url, mid_b64 }, resolver);
    return factory.create();
}

function executeProcedureFromClient(
    attClient: AttestationClient,
    procedure: ClientProcedure,
    clientAttributeStore: Dict<any>
) {
    return attClient.execute(procedure)
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
        [config.procedureZero.procedure_name]: {
            desc: config.procedureZero,
            resolver: config.zeroResolver,
        },
        [config.procedureOne.procedure_name]: {
            desc: config.procedureOne,
            resolver: config.OneResolver,
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

function setupAttestationZero(client: AttestationClient, server: AttestationServer, myAttrs: Dict<string>) {
    const procedure: ClientProcedure = {
        server: serverId,
        desc: config.procedureZero,
    };
    return executeProcedureFromClient(client, procedure, myAttrs);
}

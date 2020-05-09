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
const ATT_ZERO_VAL = "2168897456";

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
};

const serverId = (serverPort: number) => ({
    http_address: "http://localhost:" + serverPort,
    mid_b64: serverPeer.mid_b64,
});

describe("Client-Server Attestation including credential verification", function () {

    let server: AttestationServer;
    let client: AttestationClient;

    this.afterEach(async () => {
        server && server.stop();
        server = null;
        client && client.stop();
        client = null;
    })

    it("attests if consent is given", async function () {
        const serverPort = 3000;
        server = mockAttestationServer(serverPort);
        await server.start();
        client = mockAttestationClient();
        const myAttrs = {};

        const procedure: ClientProcedure = {
            server: serverId(serverPort),
            desc: config.procedureZero,
        };
        const consentFn = (data) => {
            expect(data).to.be.an("array");
            expect(data).to.have.length(1);
            expect(data[0]).to.deep.property("attribute_name", ATT_ZERO);
            expect(data[0]).to.have.property("attribute_value", ATT_ZERO_VAL);
            return Promise.resolve(true);
        };

        const result = await executeProcedureFromClient(client, procedure, myAttrs, consentFn);
        expect(result).to.not.equal(null, "Expected non-null result");
        const { data, attestations } = result;
        expect(data).to.be.an("array");
        expect(data).to.have.length(1);
        expect(data[0]).to.deep.property("attribute_name", ATT_ZERO);
        expect(data[0]).to.have.property("attribute_value", ATT_ZERO_VAL);
    });

    it("does not attest if consent is not given", async function () {
        const serverPort = 3001;
        server = mockAttestationServer(serverPort);
        await server.start();
        client = mockAttestationClient();
        const myAttrs = {};

        const procedure: ClientProcedure = {
            server: serverId(serverPort),
            desc: config.procedureZero,
        };
        const consentFn = (data) => {
            return Promise.resolve(false);
        };

        const result = await executeProcedureFromClient(client, procedure, myAttrs, consentFn);
        expect(result).to.equal(null, "Expected null result");
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
    clientAttributeStore: Dict<any>,
    consentFn: (data: Attribute[]) => Promise<boolean>,
) {
    return attClient.execute(procedure, clientAttributeStore, consentFn)
        .then((result) => {
            if (!result) {
                return result;
            }
            const { data, attestations } = result;
            data.forEach((attr: Attribute) => {
                // @ts-ignore
                clientAttributeStore[attr.attribute_name] = attr.attribute_value;
            });
            return { data, attestations };
        });
}

function mockAttestationServer(serverPort: number) {
    const procedures: Dict<ProcedureConfig> = {
        [config.procedureZero.procedure_name]: {
            desc: config.procedureZero,
            resolver: config.zeroResolver,
        },
    };
    const options = {
        ipv8_url: serverPeer.ipv8_url,
        http_port: serverPort,
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

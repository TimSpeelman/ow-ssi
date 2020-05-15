import bodyParser from "body-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import path from "path";
import QRCode from "qrcode-svg";
import uuidv4 from "uuid/v4";
import { IPv8Service } from "../../ipv8/IPv8Service";
import { OWAttester } from "../../ow/protocol/OWAttester";
import { OWAttestOffer, OWAttestOfferAttr } from "../../ow/protocol/types";
import { Dict } from "../../types/Dict";
import { loadTemporaryIPv8Configuration } from "../../util/ipv8conf";
import { ports } from "../ports";

// Set up a tiny server that serves the Example Application.
const port = ports.freeformAttestStatic;
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.listen(port);
console.log(`Freeform Attest Service running at http://localhost:${port} .`);

// SERVER 
const ipv8Config = loadTemporaryIPv8Configuration("freeform-attest");
const ipv8URL = `http://localhost:${ipv8Config.port}`;

const config = {
    pollInterval: 200,
    serverPort: ports.freeformAttestServer,
}

const ipv8service = new IPv8Service(ipv8URL, config.pollInterval);
ipv8service.start();

// Set up an attestation server
const attestationServer = express();
attestationServer.use(bodyParser.json({ type: "application/json" }));
attestationServer.use(cors());

let offers: Dict<OWAttestOffer> = {};

interface NameValuePair {
    attribute_name: string,
    attribute_value: string,
}

/** Create uuid reference to AttestOffer */
attestationServer.post("/createAttestOffer", function (req: Request, res: Response) {
    const uuid = uuidv4();
    const attributes: NameValuePair[] = req.body.attributes;

    const offer: OWAttestOffer = {
        attester_id: ipv8Config.mid_b64,
        attributes: attributes.map((a): OWAttestOfferAttr => ({
            format: "id_metadata",
            name: a.attribute_name,
            value: a.attribute_value,
        })),
        expiresAtTimeInMillis: Date.now() + 60 * 1000,
        ref: "abc",
    }

    offers[uuid] = offer;

    const url = `http://localhost:${config.serverPort}/attestMe?uuid=${uuid}`
    const data = { type: "IntentToAttest", uuid, url }
    const qr = new QRCode({
        content: JSON.stringify(data),
        width: 256,
        height: 256,
        color: "#000000",
        background: "#ffffff",
        ecl: "M",
    }).svg();

    res.send({ data, qr })
})


/** Request the AttestOffer by uuid */
attestationServer.post("/attestMe", async function (req: Request, res: Response, next: any) {
    const uuid = req.query.uuid;
    const subject_id = req.body.subject_id;

    const baseOffer = offers[uuid];
    const offer = { ...baseOffer, subject_id };

    console.log("We will attest to", offer)
    attester.attestByOffer(offer).then((a => console.log("attestation staged"))).catch(next)

    res.send({ offer });
})


attestationServer.listen(config.serverPort);
console.log(`Attestation Server listening at port ${config.serverPort}.`);


const attester = new OWAttester(ipv8service.attesterService);

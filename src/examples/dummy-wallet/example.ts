import Axios from "axios";
import bodyParser from "body-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import { VerifyHttpClient } from "../../auth/HttpClient";
import { IPv8Service } from "../../ipv8/IPv8Service";
import { OWAttributeRepository } from "../../ow/OWAttributeRepository";
import { OWAttestee } from "../../ow/protocol/OWAttestee";
import { OWVerifiee } from "../../ow/protocol/OWVerifiee";
import { OWVerifyRequestResolver } from "../../ow/resolution/OWVerifyRequestResolver";
import { loadTemporaryIPv8Configuration } from "../../util/ipv8conf";
import { ports } from "../ports";

class DummyWallet {

    public verifiee: OWVerifiee;
    public attestee: OWAttestee;
    public repo: OWAttributeRepository;
    public resolver: OWVerifyRequestResolver;

    constructor(
        protected me: IPv8Service,
        protected myId: string,
        protected port: number,
    ) {

        this.verifiee = new OWVerifiee(me.verifieeService);
        this.attestee = new OWAttestee(me.attesteeService);
        this.repo = new OWAttributeRepository();
        this.resolver = new OWVerifyRequestResolver(myId, this.repo);
    }

    start() {
        console.log("Operating IPv8 with MID", this.myId);

        this.me.observer.onAttestation(a => console.log("We have a new Attestation: ", a))

        // Set up a tiny server that represents the Client's Wallet.
        // We will fake the QR scan by a GET request in this server,
        // including the uuid.
        const app = express();
        app.use(bodyParser.json({ type: "application/json" }));
        app.use(cors());

        app.get("/scan", async (req: Request, res: Response, next: any) => {
            console.log("GET /scan");
            res.setHeader("content-type", "application/json");

            const qrString = req.query.qr;
            const refData = JSON.parse(qrString);

            if (refData.type === "IntentToVerify") {

                console.log("Scanned an IntentToVerify:", refData);
                return this.handleIntentToVerify(refData, req, res, next);
            } else if (refData.type === "IntentToAttest") {

                console.log("Scanned an IntentToAttest:", refData);
                return this.handleIntentToAttest(refData, req, res, next);
            } else {
                console.log("Scanned unknown object:", refData);
            }

        })

        app.listen(this.port);

        console.log(`Wallet listening at port ${this.port}.`);
    }

    async handleIntentToVerify(intent: any, req: Request, res: Response, next: any) {

        try {
            const authClient = new VerifyHttpClient(this.verifiee);
            const request = await authClient.getVerifyRequest(intent.url);

            console.log("Received OW:VerifyRequest: ", request)

            // Alice handles the request
            const resolveResult = await this.resolver.resolveRequest(request);

            console.log("Resolved request to: ", resolveResult)

            if (resolveResult.status !== "success") {
                console.log("Cannot respond, because request cannot be resolved");
                return res.send(false);
            }

            // Verification should complete
            await authClient.verifyMe(request, resolveResult.response);

            res.send(true);

        } catch (e) {
            console.log("Failure", e);
            next(e);
        }
    }

    async handleIntentToAttest(intent: any, req: Request, res: Response, next: any) {

        try {


            const offerData = await Axios.post(intent.url, { subject_id: this.myId }).then(r => r.data);

            console.log("Received OW:AttestOffer: ", offerData.offer);

            const atts = await this.attestee.requestAttestationByOffer(offerData.offer);
            console.log("Result of attestation:", atts);

            atts.forEach((a) => {
                console.log("Putting in repo: " + a);
                this.repo.put(a);
            })

            res.send(true);

        } catch (e) {
            console.log("Failure", e);
            next(e);
        }

    }

}

const ipv8Config = loadTemporaryIPv8Configuration("dummy-wallet");
const ipv8URL = `http://localhost:${ipv8Config.port}`;

const me = new IPv8Service(ipv8URL);
me.start();

const myId = ipv8Config.mid_b64;

const port = ports.dummyWallet;

const wallet = new DummyWallet(me, myId, port);
wallet.start();

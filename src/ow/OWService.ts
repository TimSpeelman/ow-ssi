import { AttesteeService, AttesterService, PeerService, VerifieeService, VerifierService } from "../../modules/browser/ipv8";
import { IPv8Service } from "../ipv8/IPv8Service";
import { OWAPI } from "./api/OWAPI";
import { OWObserver } from "./events/OWObserver";

export class OWService extends IPv8Service {

    public api: OWAPI;
    public observer: OWObserver;

    constructor(
        urlToIPv8: string,
        pollIntervalInMillis: number = 500,
        protected timeInMillis: () => number = Date.now
    ) {
        super(urlToIPv8, pollIntervalInMillis, timeInMillis);
        this.api = new OWAPI(urlToIPv8);
        this.observer = new OWObserver(this.api, pollIntervalInMillis);
        this.peerService = new PeerService(this.api, this.observer);
        this.attesteeService = new AttesteeService(this.api, this.observer, this.peerService);
        this.attesterService = new AttesterService(this.api, this.observer, this.timeInMillis);
        this.verifieeService = new VerifieeService(this.api, this.observer, this.peerService, this.timeInMillis);
        this.verifierService = new VerifierService(this.api, this.observer, this.peerService);
    }

}

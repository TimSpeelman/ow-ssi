import { IPv8API } from "./api/IPv8API";
import { IPv8Observer } from "./events/IPv8Observer";
import { AttesteeService } from "./services/AttesteeService";
import { AttesterService } from "./services/AttesterService";
import { PeerService } from "./services/PeerService";
import { VerifieeService } from "./services/VerifieeService";
import { VerifierService } from "./services/VerifierService";

/** 
 * Wraps the entire IPv8 Service into a single facade.
 */
export class IPv8Service {

    public peerService: PeerService;
    public attesteeService: AttesteeService;
    public attesterService: AttesterService;
    public verifieeService: VerifieeService;
    public verifierService: VerifierService;

    public api: IPv8API;
    public observer: IPv8Observer;

    constructor(
        urlToIPv8: string,
        pollIntervalInMillis: number = 500,
        private timeInMillis: () => number = Date.now
    ) {
        this.api = new IPv8API(urlToIPv8);
        this.observer = new IPv8Observer(this.api, pollIntervalInMillis);
        this.peerService = new PeerService(this.api, this.observer);
        this.attesteeService = new AttesteeService(this.api, this.observer, this.peerService);
        this.attesterService = new AttesterService(this.api, this.observer, this.timeInMillis);
        this.verifieeService = new VerifieeService(this.api, this.observer, this.peerService, this.timeInMillis);
        this.verifierService = new VerifierService(this.api, this.observer, this.peerService);
    }

    start() {
        this.observer.start();
    }

    stop() {
        this.observer.stop();
    }

}



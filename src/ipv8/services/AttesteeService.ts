import { race } from "../../util/race";
import { IPv8API } from "../api/IPv8API";
import { Attestation } from "../api/types";
import { IPv8Observer } from "../events/IPv8Observer";
import { PeerService } from "./PeerService";
import { AttestationSpec, IAttesteeService } from "./types/IAttesteeService";

/**
 * The AttesteeService requests attestation and awaits the result
 */
export class AttesteeService implements IAttesteeService {

    constructor(
        private api: IPv8API,
        private observer: IPv8Observer,
        private peerService: PeerService,
    ) { }

    public async requestAttestation(
        mid_b64: string,
        credentials: AttestationSpec[],
        timeoutPerAttestationInMillis = 5000,
    ): Promise<Attestation[]> {
        this.requireIPv8Observer();

        let results = [];
        for (let c of credentials) {
            // IPv8 cannot handle parallel attestation requests, so process in serial.
            const r = await this.requestAttestationForOne(mid_b64, c.attribute_name, c.id_format, timeoutPerAttestationInMillis);
            results.push(r);
        }
        return results;
    }

    public requestAttestationForOne(
        mid_b64: string,
        attribute_name: string,
        id_format: string,
        timeoutInMillis = 5000,
    ): Promise<Attestation> {
        this.requireIPv8Observer();

        return new Promise(async (_resolve, _reject) => {
            const [resolve, reject] = race(_resolve, _reject); // only allow the first call
            setTimeout(() => reject(new Error("Timeout")), timeoutInMillis);

            try {
                await this.peerService.findPeer(mid_b64, timeoutInMillis - 500);

                this.observer.onAttestation((attestation) => {
                    if (attribute_name === attestation.attribute_name) {
                        resolve(attestation);
                    }
                });

                await this.api.requestAttestation(mid_b64, attribute_name, id_format)


            } catch (err) {
                reject(err);
            }
        });
    }

    protected requireIPv8Observer() {
        if (!this.observer.isRunning) {
            throw new Error("IPv8 observer is not running");
        }
    }
}

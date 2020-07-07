import debug from "debug";
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

    protected log = debug("ow-ssi:ipv8:attestee");

    constructor(
        private api: IPv8API,
        private observer: IPv8Observer,
        private peerService: PeerService,
    ) { }

    public async requestAttestation(
        mid_b64: string,
        credentials: AttestationSpec[],
        timeoutPerAttestationInMillis = 10000,
    ): Promise<Attestation[]> {
        this.requireIPv8Observer();

        let results = [];
        for (let c of credentials) {
            // IPv8 cannot handle parallel attestation requests, so process in serial.
            const r = await this.requestAttestationForOne(mid_b64, c.attribute_name, c.id_format, timeoutPerAttestationInMillis);
            results.push(r);
        }
        this.log(`Received ${credentials.length} attestations from ${mid_b64}. Complete.`);
        return results;
    }

    public requestAttestationForOne(
        mid_b64: string,
        attribute_name: string,
        id_format: string,
        timeoutInMillis = 10000,
    ): Promise<Attestation> {
        this.requireIPv8Observer();

        return new Promise(async (_resolve, _reject) => {
            const [resolve, reject] = race(_resolve, _reject); // only allow the first call
            setTimeout(() => reject(new Error(`Timeout. Attestation of '${attribute_name}' by ${mid_b64} took more than ${timeoutInMillis}ms.`)), timeoutInMillis);

            try {
                await this.peerService.findPeer(mid_b64, timeoutInMillis - 500);

                this.observer.onAttestation((attestation) => {
                    if (attribute_name === attestation.attribute_name) {
                        this.log("Received attestation", attestation);
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

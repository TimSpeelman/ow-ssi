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
        private ipv8observer: IPv8Observer,
        private peerService: PeerService,
    ) { }

    public async requestAttestation(
        mid_b64: string,
        credentials: AttestationSpec[],
    ): Promise<Attestation[]> {

        let results = [];
        for (let c of credentials) {
            // IPv8 cannot handle parallel attestation requests, so process in serial.
            const r = await this.requestAttestationForOne(mid_b64, c.attribute_name, c.id_format);
            results.push(r);
        }
        return results;
    }

    public requestAttestationForOne(
        mid_b64: string,
        attribute_name: string,
        id_format: string
    ): Promise<Attestation> {

        return new Promise(async (resolve, reject) => {
            try {
                await this.peerService.findPeer(mid_b64);

                this.api.requestAttestation(mid_b64, attribute_name, id_format);

                this.ipv8observer.onAttestation((attestation) => {
                    if (attribute_name === attestation.attribute_name) {
                        resolve(attestation);
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    }
}

import { IPv8API } from "../api/IPv8API";
import { IPv8Observer } from "../events/IPv8Observer";
import { PeerService } from "./PeerService";
import { AttributeWithHash } from './types/Attribute';
import { IVerifierService } from './types/IVerifierService';

/**
 * The VerifierService verifies attributes through IPv8.
 */
export class VerifierService implements IVerifierService {

    constructor(
        private api: IPv8API,
        private ipv8observer: IPv8Observer,
        private peerService: PeerService,
    ) { }

    public verify(
        mid_b64: string,
        credentials: AttributeWithHash[],
    ): Promise<boolean> {
        return Promise.all(credentials.map(c => this.verifySingle(mid_b64, c.attribute_hash, c.attribute_value))).then(
            oks => !oks.some(ok => !ok)
        )
    }

    /** Promises a boolean, true when the given attribute is verified on time, false if not. */
    public verifySingle(
        mid_b64: string,
        attribute_hash_b64: string,
        attribute_value: string
    ): Promise<boolean> {
        const threshold = 0.5; // fixme

        return new Promise(async (resolve, reject) => {
            try {
                await this.peerService.findPeer(mid_b64);

                this.api.requestVerification(mid_b64, attribute_hash_b64, attribute_value);

                this.ipv8observer.onVerification((verif) => {
                    if (verif.attribute_hash === attribute_hash_b64 && verif.probability > threshold) {
                        resolve(true);
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    }
}

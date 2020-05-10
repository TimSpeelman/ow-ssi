import debug from "debug";
import { IPv8API } from "../api/IPv8API";
import { IPv8Observer } from "../events/IPv8Observer";
import { PeerService } from "./PeerService";
import { AttributeWithHash } from './types/Attribute';
import { IVerifierService } from './types/IVerifierService';

const log = debug("ow-ssi:ipv8:verifiee");

/**
 * The VerifierService verifies attributes through IPv8.
 */
export class VerifierService implements IVerifierService {

    constructor(
        private api: IPv8API,
        private observer: IPv8Observer,
        private peerService: PeerService,
        private verificationThreshold = 0.99999999,
    ) { }

    public verify(
        mid_b64: string,
        credentials: AttributeWithHash[],
    ): Promise<boolean> {
        this.requireIPv8Observer();
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
        this.requireIPv8Observer();

        return new Promise(async (resolve, reject) => {
            try {
                await this.peerService.findPeer(mid_b64);

                log("Requesting verification", mid_b64, attribute_hash_b64, attribute_value);
                this.api.requestVerification(mid_b64, attribute_hash_b64, attribute_value);

                this.observer.onVerification((verif) => {
                    if (verif.attribute_hash === attribute_hash_b64) {
                        if (verif.probability > this.verificationThreshold) {
                            resolve(true);
                        } else if (verif.probability > 0) {
                            resolve(false);
                            log(`Non-zero verification output did not pass the threshold of ${this.verificationThreshold}:`, verif)
                        }
                    }
                });
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

import { IPv8Service } from "../../ipv8/IPv8Service";
import { IVerifyRequestResolver } from "../../ow/resolution/types";
import { AttestationClient } from './AttestationClient';

/** Creates an Attestation Client with all necessary dependencies. */
export class AttestationClientFactory {
    constructor(
        private config: AttestationClientConfig,
        private resolver: IVerifyRequestResolver,
        private time = Date.now) { }

    public create() {
        const service = new IPv8Service(this.config.ipv8_url);
        service.start();
        const { mid_b64 } = this.config;
        return new AttestationClient({ mid_b64 },
            service.api,
            service.verifieeService,
            service.attesteeService,
            this.resolver)
    }
}

export interface AttestationClientConfig {
    ipv8_url: string
    mid_b64: string
}

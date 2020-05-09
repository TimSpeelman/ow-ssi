import { OWVerifieeService } from "./OWVerifieeService";
import { OWVerifyRequestResolver, ResolutionResult } from "./OWVerifyRequestResolver";
import { OWVerifyRequest } from "./types";

export class OWVerifyRequestHandler {

    private consentCallback: ConsentCallback; // TODO : can also disambiguate

    /** Allowed references */
    private allowedRefs: string[] = [];

    constructor(
        private resolver: OWVerifyRequestResolver,
        private verifieeService: OWVerifieeService,
        private allowWithoutReference = false) {

    }

    setConsentCallback(callback: ConsentCallback) {
        this.consentCallback = callback;
    }

    async handleRequest(req: OWVerifyRequest) {
        // Filter out requests that do not have a registered reference (i.e. are not expected)
        if (!this.allowWithoutReference && !this.allowedRefs.find(r => r === req.ref)) {
            console.log("Ignored request", req.ref)
            return;
        }

        const result = await this.resolver.resolveRequest(req);

        const consent = await this.consentCallback(result);

        if (consent) {
            const validUntil = Date.now() + 10000; // FIXME
            this.verifieeService.allowVerification(req, validUntil);
        }
    }

    /** Allows any future request that comes in via this reference */
    allowRef(ref: string) {
        this.allowedRefs.push(ref);
    }

    /** Removes an allowed reference */
    disallowRef(ref: string) {
        this.allowedRefs = this.allowedRefs.filter(r => r !== ref);
    }

}

export type ConsentCallback = (res: ResolutionResult) => Promise<boolean>

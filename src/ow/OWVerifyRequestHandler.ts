import { OWVerifiee } from "./protocol/OWVerifiee";
import { OWVerifyRequest } from "./protocol/types";
import { OWVerifyRequestResolver } from "./resolution/OWVerifyRequestResolver";
import { ResolutionResult } from "./resolution/types";

export class OWVerifyRequestHandler {

    private consentCallback: VerifyConsentCallback; // TODO : can also disambiguate

    /** Allowed references */
    private allowedRefs: string[] = [];

    constructor(
        private resolver: OWVerifyRequestResolver,
        private verifieeService: OWVerifiee,
        private allowWithoutReference = false) {

    }

    setConsentCallback(callback: VerifyConsentCallback) {
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

export type VerifyConsentCallback = (res: ResolutionResult) => Promise<boolean>

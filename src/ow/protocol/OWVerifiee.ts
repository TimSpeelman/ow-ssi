import { VerifieeService } from "../../ipv8/services/VerifieeService";
import { OWVerifyRequest } from "../types";
import { OWVerifyRequestValidator } from "./syntax-validation";

/**
 * Takes an <OW:VerifyRequest> and executes IPv8 verification as Verifiee.
 */
export class OWVerifiee {

    constructor(private ipv8Verifiee: VerifieeService, ) { }

    validateRequest(request: OWVerifyRequest): string[] {
        const error = OWVerifyRequestValidator(request);
        return error ? [error] : [];
    }

    /** Allow IPv8 validation based on an OWVerifyRequest */
    allowVerification(
        vReq: OWVerifyRequest,
        validUntil: number) {

        const names = vReq.attributes.map(a => a.name);
        return this.ipv8Verifiee.stageVerification(vReq.verifier_id, names, validUntil);
    }

}

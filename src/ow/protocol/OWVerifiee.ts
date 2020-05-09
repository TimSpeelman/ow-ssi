import { IVerifieeService } from "../../ipv8/services/types/IVerifieeService";
import { OWVerifyRequestValidator } from "./syntax-validation";
import { OWVerifyRequest } from "./types";

/**
 * Takes an <OW:VerifyRequest> and executes IPv8 verification as Verifiee.
 */
export class OWVerifiee {

    constructor(private ipv8Verifiee: IVerifieeService) { }

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

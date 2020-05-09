/**
 * Verifier 
 */

import { AttributeWithHash } from "../ipv8/services/types/Attribute";
import { VerifierService } from "../ipv8/services/VerifierService";
import { OWVerifyResponseValidator } from "./syntax-validation";
import { OWVerifyRequest, OWVerifyResponse } from "./types";


export class OWVerifierService {

    constructor(
        private ipv8Verifier: VerifierService
    ) { }

    // TODO: apply constraints
    validateResponse(req: OWVerifyRequest, resp: OWVerifyResponse): string[] {

        const formatErrors = OWVerifyResponseValidator(resp);

        if (formatErrors) {
            return [formatErrors];
        }

        // Continue with semantic validation

        const errors = [];

        if (req.ref !== resp.ref) {
            errors.push("References do not match")
        }

        if (req.subject_id && resp.subject_id !== req.subject_id) {
            errors.push("Subject ID different from request");
        }

        if (req.attributes.length !== resp.attributes.length) {
            errors.push("Invalid number of attributes");
        }

        const queue = req.attributes.slice();

        resp.attributes.forEach(respAttr => {
            const index = queue.findIndex(a => a.ref === respAttr.ref);

            if (index < 0) {
                errors.push(`Provided attribute with ref '${respAttr.ref}' was not requested`)
            } else {
                const reqAttr = queue.splice(index, 1)[0];
                if (reqAttr.include_value && !respAttr.value) {
                    errors.push(`Missing value for attribute with ref '${respAttr.ref}'`)
                }
            }
        })

        queue.forEach((reqAttr) => {
            errors.push(`Response missing attribute with ref '${reqAttr.ref}'`)
        })

        return errors;

    }


    verify(req: OWVerifyRequest, resp: OWVerifyResponse) {
        const credentials: AttributeWithHash[] = resp.attributes.map((respAttr) => {
            const reqAttr = req.attributes.find(a => a.ref === respAttr.ref);
            return {
                attribute_name: reqAttr.name,
                attribute_hash: respAttr.hash,
                attribute_value: respAttr.value, // FIXME. If response does not specify VALUE, what will you test?
            }
        })
        return this.ipv8Verifier.verify(resp.subject_id, credentials);
    }

}

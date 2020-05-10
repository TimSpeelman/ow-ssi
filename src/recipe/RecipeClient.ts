import { OWAttestee } from "../ow/protocol/OWAttestee";
import { OWVerifiee } from "../ow/protocol/OWVerifiee";
import { AttestedAttr, OWAttestOffer, OWVerifyResponse } from "../ow/protocol/types";
import { Recipe, RecipeRequest } from "./types";

/**
 * Execute an Open Wallet Recipe as client.
 * 
 * Given some Recipe and OW:VerifyResponse..
 * 1. Formulate a RecipeRequest including the VResp.
 * 2. Send the RecipeRequest to the recipe's service endpoint URL.
 * 3. Receive an OWAttestOffer.
 * 4. Determine whether this offer is acceptable (i.e. consent).
 * 5. Request attestation of the OWAttestOffer.
 * 
 */

export class RecipeClient {

    constructor(
        protected myId: string,
        protected verifiee: OWVerifiee,
        protected attestee: OWAttestee,
    ) { }

    createProcess(recipe: Recipe): RecipeClientProcess {
        return new RecipeClientProcess(this.myId, this.verifiee, this.attestee, recipe);
    }

}

export class RecipeClientProcess {
    constructor(
        protected myId: string,
        protected verifiee: OWVerifiee,
        protected attestee: OWAttestee,
        protected recipe: Recipe,
    ) { }

    /** Allow verification. */
    public allowVerification(vResp?: OWVerifyResponse) { // TODO: does this belong here?
        if (this.recipe.verify_request) {
            const validUntil = Date.now() + 10000; // FIXME
            return this.verifiee.allowVerification(this.recipe.verify_request, validUntil);
        }
    }

    /** Generate a RecipeRequest for this recipe, with VerifyResponse if required. */
    public createRequest(vResp?: OWVerifyResponse): RecipeRequest {
        if (this.recipe.verify_request && !vResp) {
            throw new Error("Recipe requires verification, no VerifyResponse provided.");
        }
        return {
            recipe_name: this.recipe.name,
            subject_id: this.myId,
            verify_response: vResp,
        }
    }

    /** Upon receiving an offer, validate it syntactically and semantically (must match the recipe). */
    public validateOffer(offer: OWAttestOffer): string[] {
        const queue = offer.attributes;
        const syntaxError = this.attestee.validateOffer(offer);
        if (syntaxError) {
            return syntaxError;
        }
        const errors = [];
        this.recipe.attributes.forEach(a => {
            const i = queue.findIndex(o => o.name === a.name);
            if (i < 0) {
                errors.push(`Missing attribute ${a.name} in offer.`);
                return;
            }

            const offered = queue.splice(i, 1)[0]; // remove from queue
            if (offered.format !== a.format) {
                errors.push(`Format of attribute ${a.name} is different in offer.`);
            }
        })
        if (queue.length > 0) {
            errors.push(`Offer contains unadvertised attributes: ${queue.map(q => q.name).join(", ")}.`);
        }

        return errors;
    }

    /** Request attestatoin based on this offer. */
    public requestAttestation(offer: OWAttestOffer): Promise<AttestedAttr[]> {
        return this.attestee.requestAttestationByOffer(offer);
    }

}

import { OWAttestee } from "../ow/protocol/OWAttestee";
import { OWVerifiee } from "../ow/protocol/OWVerifiee";
import { AttestedAttr, OWAttestOffer, OWVerifyResponse } from "../ow/protocol/types";
import { Recipe, RecipeRequest } from "./types";


type Connection = {
    send: (message: any) => Promise<any>
}

/**
 * Execute an Open Wallet Recipe as client.
 * 
 * Child implementations of this abstract class can specify the protocol/transport
 * of sending a request to the RecipeServer and the logic to consent to attestation.
 */
export abstract class RecipeClient {

    constructor(
        protected myId: string,
        protected verifiee: OWVerifiee,
        protected attestee: OWAttestee,
    ) { }

    async requestRecipe(recipe: Recipe, vResp?: OWVerifyResponse): Promise<AttestedAttr[]> {
        const request = this.makeRecipeRequest(recipe, vResp);

        if (recipe.verify_request) {
            const validUntil = Date.now() + 10000; // FIXME
            this.verifiee.allowVerification(recipe.verify_request, validUntil);
        }

        const offer: OWAttestOffer = await this.sendRequestToServer(recipe, request);

        const errors = this.validateOffer(recipe, offer);
        if (errors.length > 0) {
            throw new Error("Illegal server offer: " + errors[0]);
        }

        if (await this.consentToAttestation(recipe, offer)) {
            return this.attestee.requestAttestationByOffer(offer);
        } else {
            return [];
        }
    }

    protected abstract sendRequestToServer(recipe: Recipe, request: RecipeRequest): Promise<OWAttestOffer>

    protected abstract consentToAttestation(recipe: Recipe, offer: OWAttestOffer): Promise<boolean>

    protected validateOffer(recipe: Recipe, offer: OWAttestOffer): string[] {
        const queue = offer.attributes;
        const syntaxError = this.attestee.validateOffer(offer);
        if (syntaxError) {
            return syntaxError;
        }
        const errors = [];
        recipe.attributes.forEach(a => {
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

    protected makeRecipeRequest(recipe: Recipe, vResp: OWVerifyResponse): RecipeRequest {
        return {
            recipe_name: recipe.name,
            subject_id: this.myId,
            verify_response: vResp,
        }
    }

}
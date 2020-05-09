import { OWAttestee } from "../ow/protocol/OWAttestee";
import { OWVerifiee } from "../ow/protocol/OWVerifiee";
import { OWAttestOffer, OWVerifyResponse } from "../ow/protocol/types";
import { Recipe, RecipeRequest } from "./types";


type Connection = {
    send: (message: any) => Promise<any>
}

/**
 * Execute an Open Wallet Recipe as client.
 */
export class RecipeClient {

    constructor(
        protected myId: string,
        protected verifiee: OWVerifiee,
        protected attestee: OWAttestee,
        protected connection: Connection,
    ) { }

    async requestRecipe(recipe: Recipe, vResp?: OWVerifyResponse): Promise<OWAttestOffer> {
        const request = this.makeRecipeRequest(recipe, vResp);

        if (recipe.verify_request) {
            const validUntil = Date.now() + 10000; // FIXME
            this.verifiee.allowVerification(recipe.verify_request, validUntil);
        }

        // TODO send request
        const offer: OWAttestOffer = await this.connection.send(request);

        const errors = this.validateOffer(recipe, offer);
        if (errors.length > 0) {
            throw new Error("Illegal server offer: " + errors[0]);
        }

        return offer;
    }

    validateOffer(recipe: Recipe, offer: OWAttestOffer): string[] {
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

    makeRecipeRequest(recipe: Recipe, vResp: OWVerifyResponse): RecipeRequest {
        return {
            recipe_name: recipe.name,
            subject_id: this.myId,
            verify_response: vResp,
        }
    }

}
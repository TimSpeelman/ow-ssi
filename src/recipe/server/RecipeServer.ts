import { IPv8Service } from "../../ipv8/IPv8Service";
import { Attribute } from "../../ipv8/services/types/Attribute";
import { OWAttester } from "../../ow/protocol/OWAttester";
import { OWVerifier } from "../../ow/protocol/OWVerifier";
import { OWAttestOffer, OWVerifyRequest, OWVerifyResponse } from "../../ow/protocol/types";
import { Dict } from "../../types/Dict";
import { Recipe, RecipeRequest } from "../types";

export type RecipeResolver = (response?: OWVerifyResponse) => Promise<Attribute[]>;

export interface RecipeConfiguration {
    recipe: Recipe,
    resolver: RecipeResolver,
}

export class RecipeServer {

    constructor(
        private myId: string,
        private ipv8Service: IPv8Service,
        private recipes: Dict<RecipeConfiguration>) { }

    async executeRecipe(request: RecipeRequest): Promise<OWAttestOffer> {
        const config = this.recipes[request.recipe_name];
        if (!config) {
            throw new Error("Recipe does not exist");
        }
        const { recipe, resolver } = config;

        if (recipe.verify_request) {
            const ok = await this.performVerification(recipe.verify_request, request.verify_response)
            if (!ok) {
                throw new Error("Verification failed.");
            }
        }

        const data: any = await resolver(request.verify_response); // TODO RESOLVE

        const offer = this.makeOffer(recipe, request.subject_id, data);

        const attester = new OWAttester(this.ipv8Service.attesterService);
        attester.attestByOffer(offer);

        return offer;
    }

    async performVerification(vReq: OWVerifyRequest, vResp: OWVerifyResponse) {
        const verifier = new OWVerifier(this.ipv8Service.verifierService);
        const errors = verifier.validateResponse(vReq, vResp);
        if (errors.length > 0) {
            throw new Error("VerifyResponse validation failed: " + errors[0]);
        }

        return verifier.verify(vReq, vResp);
    }

    protected makeOffer(recipe: Recipe, subject_id: string, data: Attribute[]): OWAttestOffer {
        return {
            ref: "FIXME",
            attester_id: this.myId,
            subject_id: subject_id,
            attributes: recipe.attributes.map((a, index) => ({
                ref: a.name,
                format: a.format,
                value: data[index].attribute_value,
                name: a.name,
            })),
            expiresAtTimeInMillis: Date.now() + 60000, // FIXME
        }
    }

}
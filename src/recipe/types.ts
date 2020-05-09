import { OWVerifyRequest, OWVerifyResponse } from "../ow/protocol/types";
import { Dict } from "../types/Dict";
import { AttributeDescription } from "../types/types";

/**
 * An AttestationService can offer recipes that state which attributes
 * are offered, and which verification is required.
 * 
 * @example
 * {
 *     name: "p_kvknr",
 *     title: {
 *         nl_NL: "KVK Nummer",
 *     },
 *     attributes: [{
 *         name: "kvknr",
 *         format: "id_metadata",
 *         title: {
 *             nl_NL: "KVK Nummer"
 *         },
 *     }],
 *     verify_request: {
 *         ref: "FIXME",
 *         verifier_id: "FIXME",
 *         attributes: [
 *             {
 *                 ref: "bsn",
 *                 name: "bsn",
 *                 format: "id_metadata",
 *                 include_value: true,
 *             }
 *         ]
 *     }
 * }
 */
export interface Recipe {
    name: string
    title: Dict<string>;
    verify_request?: OWVerifyRequest; // this may not be entirely suitable

    /** The attributes that are offered by this recipe */
    attributes: AttributeDescription[];
}

/**
 * A client of an AttestationService must send a RecipeRequest to 
 * use an offered Recipe.
 */
export interface RecipeRequest {
    recipe_name: string,
    verify_response?: OWVerifyResponse,
    subject_id: string,
}


export interface RecipeServiceDescriptor {
    id: string;
    mid_b64: string;
    url: string;
    recipe_url: string;
    /** Title for each language */
    title: Dict<string>;
    /** Description for each language */
    description: Dict<string>;
    website: string;
    logo_url: string;
    /** All available recipes at this provider */
    recipes: Dict<Recipe>;
}

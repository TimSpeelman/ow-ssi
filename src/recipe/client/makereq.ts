import { OWVerifyResponse } from "../../ow/protocol/types";
import { Recipe, RecipeRequest } from "../types";

/** Turn Recipe + VResp into RecipeRequest */
export function makeRecipeRequest(recipe: Recipe, vResp: OWVerifyResponse): RecipeRequest {
    return {
        recipe_name: recipe.name,
        subject_id: vResp.subject_id,
        verify_response: vResp,
    }
}

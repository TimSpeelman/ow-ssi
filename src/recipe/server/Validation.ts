import { Validate } from '../../util/validate';
import { RecipeRequestValidator } from "../syntax-validation";

const { many, hasKey, arrayWithEach, atKey } = Validate

export const Validation = {
    postRecipe: many([
        atKey('request', RecipeRequestValidator)
    ]),
}

import { OWVerifyRequestValidator, OWVerifyResponseValidator } from "../ow/protocol/syntax-validation";
import { Validate } from '../util/validate';

const { number, object, bool, optional, many, hasKey, arrayWithEach, atKey, truthy, string } = Validate

export const AttributeDescriptionValidator = many([
    object,
    atKey("name", string),
    atKey("title", object), // TODO
    atKey("format", string),
])

export const RecipeValidator = many([
    object,
    atKey("name", string),
    atKey("url", string),
    atKey("title", object), // TODO
    atKey("verify_request", optional(OWVerifyRequestValidator)),
    atKey("attributes", arrayWithEach(AttributeDescriptionValidator))
])

export const RecipeRequestValidator = many([
    object,
    atKey("recipe_name", string),
    atKey("verify_response", optional(OWVerifyResponseValidator)),
    atKey("subject_id", string),
])

import { OWVerifyReqAttrValidator } from "../../../modules/browser/ow";
import { Validate } from "../../util/validate";

const { objectWithEach, arrayWithEach, many, number, object, atKey } = Validate;

export const AuthServiceConfigValidator = many([
    object,
    atKey("templates",
        objectWithEach(many([
            object,
            atKey("attributes",
                arrayWithEach(OWVerifyReqAttrValidator))
        ]))
    ),
])


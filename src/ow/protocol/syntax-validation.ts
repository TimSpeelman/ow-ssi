import { Validate } from '../../util/validate';

const { number, object, bool, optional, many, hasKey, arrayWithEach, atKey, truthy, string } = Validate

/** 
 * Validation for all OpenWallet messages regarding structural correctness 
 */

export const OWVerifyReqAttrValidator = many([
    object,
    atKey("ref", string),
    atKey("name", string),
    atKey("format", string),
    atKey("schema_uri", optional(string)),
    atKey("include_value", optional(bool)),
])

export const OWVerifyRequestValidator = many([
    object,
    atKey("verifier_id", string),
    atKey("ref", optional(string)),
    atKey("attributes", arrayWithEach(OWVerifyReqAttrValidator)),
    atKey("subject_id", optional(string)),
    atKey("reason", optional(string)),
    atKey("http_return_address", optional(string)),
]);

export const OWVerifyRespAttrValidator = many([
    object,
    atKey("ref", string),
    atKey("hash", string),
    atKey("value", optional(string)),
]);

export const OWVerifyResponseValidator = many([
    object,
    atKey("ref", string),
    atKey("subject_id", string),
    atKey("request_hash", string),
    atKey("attributes", arrayWithEach(OWVerifyRespAttrValidator)),
])


export const OWAttestOfferAttrValidator = many([
    object,
    atKey("ref", optional(string)),
    atKey("name", string),
    atKey("format", string),
    atKey("value", string),
])

export const OWAttestOfferValidator = many([
    object,
    atKey("attester_id", string),
    atKey("ref", optional(string)),
    atKey("subject_id", optional(string)),
    atKey("attributes", arrayWithEach(OWAttestOfferAttrValidator)),
    atKey("expiresAtTimeInMillis", number),
])
import { Dict } from "../../types/Dict";

export interface OWVerifyRequest {
    type: "OWVerifyRequest",
    verifier_id: string;
    ref?: string;
    attributes: OWVerifyReqAttr[];
    subject_id?: string;
    reason?: string;
    metadata?: any;
    http_return_address?: string;
    overlay?: string;
}

export interface OWVerifyReqAttr {
    ref: string;
    name: string;
    format: string;
    schema_uri?: string;
    include_value?: boolean;
    constraints?: OWAttrConstraint[];
}

export interface OWAttrConstraint { // FIXME
    type: string
}

export interface OWVerifyResponse {
    type: "OWVerifyResponse",
    ref?: string;
    subject_id: string;
    request_hash: string;
    attributes: OWVerifyRespAttr[];
    overlay?: string;
    metadata?: any;
}

export interface OWVerifyRespAttr {
    ref: string;
    hash: string;
    value?: string;
}

export interface OWAttestOffer {
    type: "OWAttestOffer";
    attester_id: string;
    ref?: string;
    subject_id?: string;
    attributes: OWAttestOfferAttr[];
    expiresAtTimeInMillis: number;
    overlay?: string;
    metadata?: any;
}

export interface OWAttestResponse {
    type: "OWAttestResponse";
    ref: string;
    answer: boolean;
    overlay?: string;
    metadata?: any;
}

export interface OWAttestOfferAttr {
    ref?: string;
    name: string;
    format: string;
    value: string;
}

export interface OWAttestedAttr {
    name: string;
    value: string;
    format: string;
    hash: string;
    time: number;
    title: Dict<string>;
    signer_mid_b64: string;
    metadata: any;
}

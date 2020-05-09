export interface OWVerifyRequest {
    verifier_id: string;
    ref?: string;
    attributes: OWVerifyReqAttr[];
    subject_id?: string;
    reason?: string;
    metadata?: any;
    http_return_address?: string;
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
    ref: string;
    subject_id: string;
    request_hash: string;
    attributes: OWVerifyRespAttr[];
}

export interface OWVerifyRespAttr {
    ref: string;
    hash: string;
    value?: string;
}

export interface OWAttestOffer {
    attester_id: string;
    ref?: string;
    subject_id?: string;
    attributes: OWAttestOfferAttr[];
    expiresAtTimeInMillis: number;
}

export interface OWAttestOfferAttr {
    ref?: string;
    name: string;
    format: string;
    value: string;
}

export interface AttestedAttr {
    name: string;
    value: string;
    format: string;
    hash: string;
    signer_mid_b64: string;
    metadata: any;
}
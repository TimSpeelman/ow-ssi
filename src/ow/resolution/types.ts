import { OWAttestedAttr, OWVerifyReqAttr, OWVerifyRequest, OWVerifyRespAttr, OWVerifyResponse } from "../protocol/types";

export interface IAttributeStore {
    all(): Promise<OWAttestedAttr[]>
}

export interface ResolutionResult {
    status: "success" | "unresolved";
    attributes: ResolutionAttributeResult[];
    response?: OWVerifyResponse;
}

export interface ResolutionAttributeResult {
    ref: string;
    status: "success" | "ambiguous" | "missing";
    request: OWVerifyReqAttr;
    responses: OWVerifyRespAttr[];
    results: OWAttestedAttr[];
}

export interface IVerifyRequestResolver {
    resolveRequest(request: OWVerifyRequest): Promise<ResolutionResult>
}

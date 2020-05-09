import { AttestedAttr, OWVerifyReqAttr, OWVerifyRequest, OWVerifyRespAttr, OWVerifyResponse } from "../protocol/types";

export interface IAttributeStore {
    all(): Promise<AttestedAttr[]>
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
    results: AttestedAttr[];
}

export interface IVerifyRequestResolver {
    resolveRequest(request: OWVerifyRequest): Promise<ResolutionResult>
}

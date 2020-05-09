import { AttestedAttr, OWVerifyReqAttr, OWVerifyRespAttr, OWVerifyResponse } from "../types";

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

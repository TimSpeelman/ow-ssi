import debug from "debug";
import { OWVerifyReqAttr, OWVerifyRequest, OWVerifyRespAttr, OWVerifyResponse } from "../protocol/types";
import { IAttributeStore, IVerifyRequestResolver, ResolutionAttributeResult, ResolutionResult } from "./types";


const log = debug("ow-ssi:ow:resolver");

/**
 * This Resolver consumes a VerifyRequest and fetches matching attribute
 * from an AttributeRepository. For now, it does not support Constraints.
 * 
 * Resolution of such requests may fail in several ways:
 * - An attribute may be missing
 * - An attribute request may resolve to more than one attribute
 * 
 * The ResolutionResult specifies whether the result was successful, and if
 * so includes a proper OWVerifyResponse.
 */
export class OWVerifyRequestResolver implements IVerifyRequestResolver {
    constructor(
        private myId: string,
        private repo: IAttributeStore,
    ) { }

    // TODO: Apply constraints
    async resolveRequest(request: OWVerifyRequest): Promise<ResolutionResult> {
        const attributes = await Promise.all(request.attributes.map(a => this.resolveSingle(a)));
        const status = attributes.some(a => a.status !== "success") ? "unresolved" : "success";

        const response: OWVerifyResponse = {
            ref: request.ref,
            subject_id: this.myId,
            request_hash: "FIXME",
            attributes: attributes.map(a => a.responses[0]),
        }
        const result: ResolutionResult = {
            status,
            attributes,
            response,
        }
        log(status === "success" ? "Resolved request" : "Failed to resolve request", result);
        return result;
    }

    async resolveSingle(request: OWVerifyReqAttr): Promise<ResolutionAttributeResult> {
        const attrs = await this.repo.all();
        const nameMatches = attrs.filter(a => a.name === request.name);
        const results = nameMatches.filter(a => a.format === request.format);
        const responses = results.map((a): OWVerifyRespAttr => ({
            ref: request.ref,
            hash: a.hash,
            value: request.include_value ? a.value : undefined
        }));
        const status = results.length === 0 ? "missing"
            : results.length === 1 ? "success"
                : "ambiguous";

        const result: ResolutionAttributeResult = {
            ref: request.ref,
            status,
            request: request,
            responses,
            results,
        }

        log(status === "success" ? "Resolved attribute" : "Failed to resolve attribute", result);
        return result;
    }

}

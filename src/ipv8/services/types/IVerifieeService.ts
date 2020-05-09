import { InboundVerificationRequest } from "../../api/types";

/**
 * The VerifieeService stages all allowed verifications and
 * accepts incoming requests if they match the criteria
 */
export interface IVerifieeService {
    /** Stage the verification, allow a given peer to verify an attribute until a specific time. */
    stageVerification(mid_b64: string, attribute_names: string[], validUntil: number): Promise<void>
    /** On a request which is not granted, call this callback. */
    onNonStagedRequest(callback: NonStagedRequestCallback): void
}

export type NonStagedRequestCallback = (request: InboundVerificationRequest) => Promise<boolean>

import { Attestation } from "../../api/types";
import { AttributeWithHash } from './Attribute';

/**
 * The VerifierService verifies attributes through IPv8 and
 * caches the results.
 */
export interface IVerifierService {
    /** Verify n attributes of a peer, or allow a cached verification of a specific age */
    verify(
        mid_b64: string,
        credentials: AttributeWithHash[],
        options?: VerifyOptions
    ): Promise<MultiVerifyResult>
}

export interface VerifyOptions {
    maxAgeInSeconds?: number
    timeout?: number
}

export interface MultiVerifyResult {
    success: boolean;
    results: VerifyResult[];
}

export interface VerifyResult {
    success: boolean;
    attestation?: Attestation;
}

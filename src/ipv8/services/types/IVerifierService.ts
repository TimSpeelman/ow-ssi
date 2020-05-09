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
    ): Promise<boolean>
}

export interface VerifyOptions {
    maxAgeInSeconds?: number
    timeout?: number
}

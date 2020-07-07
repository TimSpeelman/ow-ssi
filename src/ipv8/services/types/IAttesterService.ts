import { Hook } from "../../../util/Hook"
import { Attestation, InboundAttestationRequest } from '../../api/types'
import { Attribute } from './Attribute'

/**
 * The AttesterService holds a list of granted attestations.
 * It listens for incoming attestation requests, and accepts
 * them when an attestation is granted, or calls an optional
 * callback otherwise.
 */
export interface IAttesterService {
    attestationHook: Hook<AttestationResult>;
    /** Grant the attestation of attributes to a particular peer. */
    stageAttestation(mid_b64: string, attributes: Attribute[], validUntil: number): void
    /** On a request which is not granted, call this callback. */
    onNonStagedRequest(callback: NonStagedRequestCallback): void
}

export interface AttestationResult {
    subject_mid: string,
    attribute: Attribute,
    attestation: Attestation,
}

export interface QueuedAttestation {
    attribute: Attribute
    validUntil: number
}

export type NonStagedRequestCallback = (request: InboundAttestationRequest) => Promise<Attribute | null>


export interface Peer {
    public_key: string
    /** IP address and port number */
    address: [string, number]
}

export interface InboundAttestationRequest {
    mid_b64: string
    attribute_name: string
    metadata: string
}

export interface Attestation {
    attribute_name: string
    attribute_hash: string
    metadata: any
    signer_mid_b64: string
}

export interface InboundVerificationRequest {
    mid_b64: string
    attribute_name: string
}

export interface VerificationOutputMap {
    [attribute_hash: string]: VerificationOutput[]
}

export interface VerificationOutput {
    value_hash: string
    probability: number
}

export interface VerificationOutputPair {
    attribute_hash: string
    value_hash: string
    probability: number
}

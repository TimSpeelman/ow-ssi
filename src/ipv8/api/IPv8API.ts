import { AxiosInstance, default as axios } from 'axios';
import debug from "debug";
import { b64encode } from '../../util/b64';
import { b64ToHex } from "../../util/b64ToHex";
import { toHttpError } from "../../util/HttpError";
import { queryString } from '../../util/queryString';
import { Attestation, InboundAttestationRequest, InboundVerificationRequest, Peer, VerificationOutputMap, VerificationOutputPair } from "./types";

/**
 * A client for the IPv8 Attestation API.
 */
export class IPv8API {

    protected log = debug("ow-ssi:ipv8:api");

    protected api: AxiosInstance

    constructor(protected baseURL: string) {
        this.api = axios.create({ baseURL });
        // Set up default error handling
        this.api.interceptors.response.use((r) => r, (e) => { throw toHttpError(e) });
    }

    /** Get my Member ID */
    public getMyId(): Promise<string> {
        return this.api
            .get('/me')
            .then(res => res.data.mid)
    }

    /** Check that this IPv8 instance is online */
    public verifyOnline(): Promise<boolean> {
        return this.listPeers()
            .then(() => true)
            .catch(() => false)
    }

    /** Get the list of discovered peers */
    public listPeers(): Promise<string[]> {
        return this.api
            .get('/attestation?type=peers')
            .then(res => res.data)
    }

    /** Make sure we look for a particular peer */
    public connectPeer(mid_b64: string): Promise<Peer[]> {
        this.log("ConnectPeer", this.baseURL, mid_b64);

        if (!mid_b64 || mid_b64.length === 0) {
            throw new Error("Not a valid mid");
        }
        return this.api
            .get(`/dht/peers/${b64ToHex(mid_b64)}`)
            .then((response: any) => response.data.peers)
    }

    /** Request an attestation (times out after 120 seconds) */
    public requestAttestation(
        mid_b64: string,
        attribute_name: string,
        id_format: string
    ): Promise<boolean> {
        const query = {
            type: 'request',
            mid: mid_b64,
            attribute_name,
            id_format
        }
        this.log("RequestAttestation", this.baseURL, query);

        return this.api
            .post(`/attestation?${queryString(query)}`)
            .then(res => res.data.success)
    }

    /** List all attestation requests we received */
    public listAttestationRequests(): Promise<InboundAttestationRequest[]> {
        return this.api
            .get('/attestation?type=outstanding')
            .then(res =>
                res.data.map(([mid_b64, attribute_name, metadata]: string[]): InboundAttestationRequest => ({
                    mid_b64,
                    attribute_name,
                    metadata
                }))
            )
    }

    /** Make an attestation */
    public attest(mid_b64: string, attribute_name: string, attribute_value: string): Promise<any> {
        const query = {
            type: 'attest',
            mid: mid_b64,
            attribute_name,
            attribute_value: b64encode(attribute_value)
        }
        this.log("Attest", this.baseURL, query);

        return this.api
            .post(`/attestation?${queryString(query)}`)
            .then(res => res.data)
    }

    /** List all created attestations */
    public listAttestations(mid?: string): Promise<Attestation[]> {
        const query = { type: 'attributes', ...(mid ? { mid } : {}) };
        return this.api
            .get('/attestation?' + queryString(query))
            .then(res =>
                res.data.map(
                    ([attribute_name, attribute_hash, metadata, signer_mid_b64]: string[]): Attestation => ({
                        attribute_name,
                        attribute_hash,
                        metadata,
                        signer_mid_b64
                    })
                )
            )
    }

    /** Request a verification (times out after 120 seconds) */
    public requestVerification(
        mid_b64: string,
        attribute_hash_b64: string,
        attribute_value: string,
        id_format: string = 'id_metadata',
        id_metadata_obj: any = null
    ): Promise<boolean> {
        const query = {
            type: 'verify',
            mid: mid_b64,
            attribute_hash: attribute_hash_b64,
            attribute_values: b64encode(attribute_value), // TODO validate
            id_format,
            id_metadata: b64encode(JSON.stringify(id_metadata_obj))
        }

        this.log("RequestVerify", this.baseURL, query);

        return this.api
            .post(`/attestation?${queryString(query)}`, '')
            .then(response => response.data.success)
    }

    /** Get all outstanding verification requests we received from peers */
    public listVerificationRequests(): Promise<InboundVerificationRequest[]> {
        return this.api
            .get('/attestation?type=outstanding_verify')
            .then(res =>
                res.data.map(([mid_b64, attribute_name]: string[]): InboundVerificationRequest =>
                    ({ mid_b64, attribute_name }))
            )
    }


    /** Allow a peer to verify a particular attribute */
    public allowVerify(mid_b64: string, attribute_name: string): Promise<boolean> {
        const query = {
            type: 'allow_verify',
            mid: mid_b64,
            attribute_name
        }

        this.log("AllowVerify", this.baseURL, query);

        return this.api
            .post(`/attestation?${queryString(query)}`)
            .then(res => res.data.success)
    }

    /** List all verification outputs (pending and completed) */
    public listVerificationOutputs(): Promise<VerificationOutputPair[]> {
        return this.api
            .get('/attestation?type=verification_output')
            .then((res: { data: VerificationOutputMap }) =>
                Object.entries(res.data)
                    .reduce((output, [attribute_hash, results]) => {
                        const pairs = results.map(result => ({
                            value_hash: result[0],
                            probability: result[1],
                            attribute_hash,
                        }))
                        return [...output, ...pairs];
                    }, [])
            )
    }

}

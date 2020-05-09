import axios, { AxiosError } from 'axios';
import { b64encode } from '../../util/b64';
import { b64ToHex } from "../../util/b64ToHex";
import { toHttpError } from "../../util/HttpError";
import { queryString } from '../../util/queryString';
import { Attestation, InboundAttestationRequest, InboundVerificationRequest, Peer, VerificationOutputMap, VerificationOutputPair } from "./types";

/**
 * A client for the IPv8 Attestation API.
 */
export class IPv8API {
    constructor(private ipv8_api_url: string) { }

    /** Check that this IPv8 instance is online */
    public verifyOnline(): Promise<boolean> {
        return this.listPeers()
            .then(() => true)
            .catch(() => false)
    }

    /** Get the list of discovered peers */
    public listPeers(): Promise<string[]> {
        return axios
            .get(this.ipv8_api_url + '/attestation?type=peers')
            .then(res => res.data)
            .catch(this.handleError.bind(this))
    }

    /** Make sure we look for a particular peer */
    public connectPeer(mid_b64: string): Promise<Peer[]> {
        return axios
            .get(this.ipv8_api_url + `/dht/peers/${b64ToHex(mid_b64)}`)
            .then((response: any) => response.data.peers)
            .catch(this.handleError.bind(this))
    }

    /** Request an attestation */
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
        return axios
            .post(this.ipv8_api_url + `/attestation?${queryString(query)}`)
            .then(res => res.data.success)
            .catch(this.handleError.bind(this))
    }

    /** List all attestation requests we received */
    public listAttestationRequests(): Promise<InboundAttestationRequest[]> {
        return axios
            .get(this.ipv8_api_url + '/attestation?type=outstanding')
            .then(res =>
                res.data.map(([mid_b64, attribute_name, metadata]: string[]): InboundAttestationRequest => ({
                    mid_b64,
                    attribute_name,
                    metadata
                }))
            )
            .catch(this.handleError.bind(this))
    }

    /** Make an attestation */
    public attest(mid_b64: string, attribute_name: string, attribute_value: string): Promise<any> {
        const query = {
            type: 'attest',
            mid: mid_b64,
            attribute_name,
            attribute_value: b64encode(attribute_value)
        }
        return axios
            .post(this.ipv8_api_url + `/attestation?${queryString(query)}`)
            .then(res => res.data)
            .catch(this.handleError.bind(this))
    }

    /** List all created attestations */
    public listAttestations(): Promise<Attestation[]> {
        return axios
            .get(this.ipv8_api_url + '/attestation?type=attributes')
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
            .catch(this.handleError.bind(this))
    }

    /** Request a verification */
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
        return axios
            .post(this.ipv8_api_url + `/attestation?${queryString(query)}`, '')
            .then(response => response.data.success)
            .catch(this.handleError.bind(this))
    }

    /** Get all outstanding verification requests we received from peers */
    public listVerificationRequests(): Promise<InboundVerificationRequest[]> {
        return axios
            .get(this.ipv8_api_url + '/attestation?type=outstanding_verify')
            .then(res =>
                res.data.map(([mid_b64, attribute_name]: string[]): InboundVerificationRequest =>
                    ({ mid_b64, attribute_name }))
            )
            .catch(this.handleError.bind(this))
    }


    /** Allow a peer to verify a particular attribute */
    public allowVerify(mid_b64: string, attribute_name: string): Promise<boolean> {
        const query = {
            type: 'allow_verify',
            mid: mid_b64,
            attribute_name
        }
        return axios
            .post(this.ipv8_api_url + `/attestation?${queryString(query)}`)
            .then(res => res.data.success)
            .catch(this.handleError.bind(this))
    }

    /** List all verification outputs (pending and completed) */
    public listVerificationOutputs(): Promise<VerificationOutputPair[]> {
        return axios
            .get(this.ipv8_api_url + '/attestation?type=verification_output')
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
            .catch(this.handleError.bind(this))
    }

    protected handleError(error: AxiosError) {
        throw toHttpError(error);
    }
}

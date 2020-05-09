import { Dict } from '../../types/Dict'
import { IPv8API } from "../api/IPv8API"
import { InboundAttestationRequest } from '../api/types'
import { IPv8Observer } from "../events/IPv8Observer"
import { Attribute } from './types/Attribute'
import { IAttesterService, NonStagedRequestCallback, QueuedAttestation } from './types/IAttesterService'

/**
 * The AttesterService holds a list of granted attestations.
 * It listens for incoming attestation requests, and accepts
 * them when an attestation is granted, or calls an optional
 * callback otherwise.
 */
export class AttesterService implements IAttesterService {
    private queue: Dict<Dict<QueuedAttestation>> = {}
    private listeners: NonStagedRequestCallback[] = []
    private listener: NonStagedRequestCallback | null = null;

    constructor(
        private api: IPv8API,
        private observer: IPv8Observer,
        private timeInMillis: () => number = Date.now
    ) {
        this.observer.onAttestationRequest((aReq) => this.onAttestationRequest(aReq));
    }

    /** Set a handler for non-staged requests. */
    public onNonStagedRequest(callback: NonStagedRequestCallback): void {
        this.listener = callback;
    }

    /** Attest to a peer some attributes within a certain time */
    public stageAttestation(mid_b64: string, attributes: Attribute[], validUntil: number): void {
        attributes.forEach(attribute => this.putGrant(mid_b64, { attribute, validUntil }))
    }

    /** Check for a valid attestation in the queue, then attest and remove it. */
    protected async onAttestationRequest(req: InboundAttestationRequest): Promise<any> {
        const { mid_b64, attribute_name } = req
        const att = this.getGrant(mid_b64, attribute_name)
        if (!att) {
            this.handleNonStagedRequest(req)
        } else {
            await this.api.attest(mid_b64, attribute_name, att.attribute.attribute_value)
            this.removeGrant(mid_b64, attribute_name)
        }
    }

    protected async handleNonStagedRequest(req: InboundAttestationRequest): Promise<void> {
        if (this.listener) {
            const result = await this.listener(req);
            this.api.attest(req.mid_b64, req.attribute_name, result.attribute_value);
        }
    }

    protected getGrant(mid_b64: string, attribute_name: string): QueuedAttestation | null {
        this.removeExpiredGrants(mid_b64)
        return this.getGrantsByPeer(mid_b64).find(i => i.attribute.attribute_name === attribute_name)
    }

    protected removeGrant(mid_b64: string, attribute_name: string) {
        const items = this.queue[mid_b64]
        delete items[attribute_name]
    }

    protected putGrant(mid_b64: string, item: QueuedAttestation) {
        if (!this.queue[mid_b64]) {
            this.queue[mid_b64] = {}
        }
        this.queue[mid_b64][item.attribute.attribute_name] = item
    }

    protected removeExpiredGrants(mid_b64: string) {
        const items = this.getGrantsByPeer(mid_b64)
        items
            .filter(a => a.validUntil < this.timeInMillis())
            .forEach(a => this.removeGrant(mid_b64, a.attribute.attribute_name))
    }

    protected getGrantsByPeer(mid_b64: string): QueuedAttestation[] {
        return Object.values(this.queue[mid_b64] || {})
    }
}

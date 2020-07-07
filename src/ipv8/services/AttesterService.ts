import debug from "debug"
import { Dict } from '../../types/Dict'
import { Hook } from "../../util/Hook"
import { IPv8API } from "../api/IPv8API"
import { InboundAttestationRequest } from '../api/types'
import { IPv8Observer } from "../events/IPv8Observer"
import { Attribute } from './types/Attribute'
import { AttestationResult, IAttesterService, NonStagedRequestCallback, QueuedAttestation } from './types/IAttesterService'

const log = debug("ow-ssi:ipv8:attester");

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

    public attestationHook = new Hook<AttestationResult>();

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
    public async stageAttestation(mid_b64: string, attributes: Attribute[], validUntil: number): Promise<void> {
        this.requireIPv8Observer();

        log("Staging attestation", { mid_b64, attributes, validUntil });

        attributes.forEach(async attribute => {
            if (!await this.attestOpenRequests(mid_b64, attribute.attribute_name, attribute.attribute_value)) {
                this.putGrant(mid_b64, { attribute, validUntil })
            }
        })
    }

    /** Check for a valid attestation in the queue, then attest and remove it. */
    protected async onAttestationRequest(req: InboundAttestationRequest): Promise<any> {
        const { mid_b64, attribute_name } = req
        log("Handling attestation request", req)

        const att = this.getGrant(mid_b64, attribute_name)
        if (!att) {
            log("Attestation request is not staged");
            await this.handleNonStagedRequest(req)
        } else {
            log("Attestation request was staged, attesting..");

            await this.attest(mid_b64, attribute_name, att.attribute.attribute_value)
            this.removeGrant(mid_b64, attribute_name)
        }
    }

    protected async handleNonStagedRequest(req: InboundAttestationRequest): Promise<void> {
        if (this.listener) {
            const result = await this.listener(req);
            if (result) {
                return this.attest(req.mid_b64, req.attribute_name, result.attribute_value);
            }
        } else {
            log("Ignored non-staged attestation request:", req);
        }
    }

    protected getGrant(mid_b64: string, attribute_name: string): QueuedAttestation | null {
        this.removeExpiredGrants(mid_b64)
        return this.getGrantsByPeer(mid_b64).find(i => i.attribute.attribute_name === attribute_name)
    }

    protected async isAlreadyRequested(mid_b64: string, attribute_name: string) {
        const requests = await this.api.listAttestationRequests();
        const matchingReq = requests.find(r => r.attribute_name === attribute_name && r.mid_b64 === mid_b64);
        return !!matchingReq;
    }

    protected async attestOpenRequests(mid_b64: string, name: string, value: string) {
        if (await this.isAlreadyRequested(mid_b64, name)) {
            log("Attesting to already received request", { mid_b64, name, value });
            return this.attest(mid_b64, name, value).then(() => true)
        } else {
            return false;
        }
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

    protected requireIPv8Observer() {
        if (!this.observer.isRunning) {
            throw new Error("IPv8 observer is not running");
        }
    }

    protected async attest(subject_mid, name: string, value: string) {
        await this.api.attest(subject_mid, name, value);

        const myId = await this.api.getMyId();
        const subjectAtts = await this.api.listAttestations(subject_mid);
        // TODO Dangerous assumption that latest attestation is the first one
        // But also IPv8 listAttestations only lists the last (not all!) attestation with a given name
        const attestation = subjectAtts.find(a => a.attribute_name === name && a.signer_mid_b64 === myId)
        const attribute: Attribute = { attribute_value: value, attribute_name: name }

        const result: AttestationResult = {
            attestation,
            attribute,
            subject_mid,
        }
        this.attestationHook.fire(result);
    }
}

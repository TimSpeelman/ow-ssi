import { Dict } from '../../types/Dict';
import { IPv8API } from '../api/IPv8API';
import { InboundVerificationRequest } from "../api/types";
import { IPv8Observer } from "../events/IPv8Observer";
import { PeerService } from "./PeerService";
import { IVerifieeService, NonStagedRequestCallback } from './types/IVerifieeService';

/**
 * The VerifieeService stages all allowed verifications and
 * accepts incoming requests if they match the criteria
 */
export class VerifieeService implements IVerifieeService {
    private stage: Dict<Dict<VerificationGrant>> = {};
    private listener: NonStagedRequestCallback | null = null;

    constructor(
        private api: IPv8API,
        private observer: IPv8Observer,
        private peerService: PeerService,
        private timeInMillis: () => number = Date.now) {

        this.observer.onVerificationRequest(vReq => this.onVerificationRequest(vReq));
    }

    /** Set a handler for non-staged requests. */
    public onNonStagedRequest(callback: NonStagedRequestCallback): this {
        this.listener = callback;
        return this;
    }

    /** Allow a peer to verify some attributes within a certain time */
    public stageVerification(
        mid_b64: string,
        attribute_names: string[],
        validUntil: number
    ): Promise<any> {
        this.requireIPv8Observer();
        return Promise.all(attribute_names.map(attr => this.stageSingle(mid_b64, attr, validUntil)))
    }

    /** Stage a single attribute for verification */
    protected stageSingle(
        mid_b64: string,
        attribute_name: string,
        validUntilTimeInMillis: number
    ): Promise<void> {
        return new Promise(resolve => {
            this.putGrant(mid_b64, { mid_b64, attribute_name, validUntilTimeInMillis: validUntilTimeInMillis, callback: resolve })
        })
    }

    /** Check for a valid attestation in the queue, then attest and remove it. */
    protected async onVerificationRequest(req: InboundVerificationRequest): Promise<any> {
        const { mid_b64, attribute_name } = req
        const att = this.getGrant(mid_b64, attribute_name)
        if (!att) {
            const ok = await this.handleNonStagedRequest(req)
            if (!ok) {
                return false
            } else {
                await this.peerService.findPeer(mid_b64)
                await this.api.allowVerify(mid_b64, attribute_name)
            }
        } else {
            await this.peerService.findPeer(mid_b64)
            await this.api.allowVerify(mid_b64, attribute_name)
            att.callback()
            this.removeGrant(mid_b64, attribute_name);
        }
    }

    protected async handleNonStagedRequest(req: InboundVerificationRequest): Promise<boolean> {
        if (this.listener) {
            return this.listener(req);
        } else {
            console.log("Ignored non-staged verification request.");
            return false;
        }
    }

    protected getGrant(mid_b64: string, attribute_name: string): VerificationGrant | null {
        this.removeExpiredGrants(mid_b64)
        return this.getGrantsByPeer(mid_b64).find(i => i.attribute_name === attribute_name) || null
    }

    protected removeGrant(mid_b64: string, attribute_name: string) {
        const items = this.stage[mid_b64]
        delete items[attribute_name]
    }

    protected putGrant(mid_b64: string, item: VerificationGrant) {
        if (!this.stage[mid_b64]) {
            this.stage[mid_b64] = {}
        }
        this.stage[mid_b64][item.attribute_name] = item
    }

    protected removeExpiredGrants(mid_b64: string) {
        const items = this.getGrantsByPeer(mid_b64)
        items
            .filter(a => a.validUntilTimeInMillis < this.timeInMillis())
            .forEach(a => this.removeGrant(mid_b64, a.attribute_name))
    }

    protected getGrantsByPeer(mid_b64: string): VerificationGrant[] {
        return Object.values(this.stage[mid_b64] || {})
    }

    protected requireIPv8Observer() {
        if (!this.observer.isRunning) {
            throw new Error("IPv8 observer is not running");
        }
    }
}

interface VerificationGrant {
    mid_b64: string
    attribute_name: string
    validUntilTimeInMillis: number
    callback: () => void
}

import { Hook } from "../../util/Hook";
import { OWAttestOffer } from "./types";

export class OWAttestSession {

    result: [];
    status = OWAttestStatus.CREATED;
    attestError: OWAttestError;

    public statusHook = new Hook<OWAttestStatus>();

    get isAttested() { return this.status === OWAttestStatus.ATTESTED }

    constructor(
        public attesterId: string,
        public subjectId: string,
        public offer: OWAttestOffer) { }

    offered() {
        this.setStatus(OWAttestStatus.OFFERED);
    }

    accepted() {
        this.setStatus(OWAttestStatus.ACCEPTED);
    }

    rejected() {
        this.setStatus(OWAttestStatus.REJECTED);
    }

    attesting() {
        this.setStatus(OWAttestStatus.ATTESTING);
    }

    attested(result: any) {
        this.result = result;
        this.setStatus(OWAttestStatus.ATTESTED);
    }

    aborted() {
        this.setStatus(OWAttestStatus.ABORTED);
    }

    error(error: OWAttestError) {
        this.attestError = error;
        this.setStatus(OWAttestStatus.ERROR);
    }

    setStatus(newStatus: OWAttestStatus) {
        if (newStatus <= this.status) {
            const oldS = OWAttestStatus[this.status];
            const newS = OWAttestStatus[newStatus];
            throw new Error(`Illegal status change (from ${oldS} to ${newS})`)
        }
        this.status = newStatus;
        this.statusHook.fire(newStatus);
    }
}

export enum OWAttestStatus {
    /** The attester created the session but did not send it */
    CREATED,
    /** The attester sent the offer to the subject */
    OFFERED,
    /** The subject responded to the offer */
    ACCEPTED,
    /** The subject rejected the offer */
    REJECTED,
    /** The IPv8 attestation is pending */
    ATTESTING,
    /** The IPv8 attestation has been completed */
    ATTESTED,
    /** The user aborted the attestation */
    ABORTED,
    /** An error occurred */
    ERROR,
}

export enum OWAttestErrorType {
    /** When connection has been lost with the counter party */
    DISCONNECTED,
    /** When the counter party fails the protocol */
    FOUL,
}

export class OWAttestError {
    static disconnected = (message: string) => new OWAttestError(OWAttestErrorType.DISCONNECTED, message);

    static foul = (message: string) => new OWAttestError(OWAttestErrorType.FOUL, message);

    constructor(readonly type: OWAttestErrorType, readonly message: string) { }
}

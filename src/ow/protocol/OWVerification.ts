import { Hook } from "../../util/Hook";
import { OWMessage } from "../api/OWAPI";
import { OWVerifyRequest, OWVerifyResponse } from "./types";

/**
 * Verifier::request
 * 
 * Verifiee::respond
 * Verifiee::reject
 * 
 * 
 * [Verifier]:
 * - sends a request
 *   - [err] no connection
 * - [evt] received a response
 *   - [err] bad message
 *   - [err] response does not match request
 *   - invoke verif
 * - [evt] received a reject
 *   - [err] already accepted
 * - [evt] request timeout
 * - [evt] (partially) verified
 * - [evt] verif timeout
 * 
 * [Verifiee]:
 * - [evt] received a request
 *   - [err] bad message
 *   - check if answerable
 *   - construct response
 *   - send response/reject
 * - [evt] response timeout
 * - [evt] received ipv8verifreq
 *   - [err] does not match session
 *   - accept/reject
 * - missing: [evt] done
 */


/** Transport */
interface OWVSender {
    send(v: OWVerification);
}

/** Has a list of sessions */
interface OWVManager {

}

/** 
 * Transport 
 * - Depends on the kind of message, if the session is not yet known
 *   it must be created. Otherwise it must be fetched.
 * 
 * Note that GUI can close whilst backend is still running.
 * Note that when GUI re-opens it will reread entire inbox.
 */
interface OWVReceiver {
    handleMessage(message: OWMessage); // transport specific?
    onReceive(handler: (v: OWVerification) => void);
}

interface OWVResponder {
    reject(v: OWVerification);
}


export class OWVerification {

    response?: OWVerifyResponse;
    result: [];
    status = OWVerificationStatus.CREATED;
    verifyError?: OWVerifyError;

    public statusHook = new Hook<OWVerificationStatus>();

    get canBeVerified() { return this.status === OWVerificationStatus.ACCEPTED }

    constructor(
        public verifierId: string,
        public subjectId: string,
        public request: OWVerifyRequest) { }

    requested() {
        this.setStatus(OWVerificationStatus.REQUESTED);
    }

    accepted(response: OWVerifyResponse) {
        this.response = response;
        this.setStatus(OWVerificationStatus.ACCEPTED);
    }

    rejected() {
        this.setStatus(OWVerificationStatus.REJECTED);
    }

    verifying() {
        this.setStatus(OWVerificationStatus.VERIFYING);
    }

    verified(result: any) {
        this.result = result;
        this.setStatus(OWVerificationStatus.VERIFIED);
    }

    aborted() {
        this.setStatus(OWVerificationStatus.ABORTED);
    }

    error(error: OWVerifyError) {
        this.verifyError = error;
        this.setStatus(OWVerificationStatus.ERROR);
    }

    setStatus(newStatus: OWVerificationStatus) {
        if (newStatus <= this.status) {
            const oldS = OWVerificationStatus[this.status];
            const newS = OWVerificationStatus[newStatus];
            throw new Error(`Illegal status change (from ${oldS} to ${newS})`)
        }
        this.status = newStatus;
        this.statusHook.fire(newStatus);
    }
}

export enum OWVerificationStatus {
    /** The verifier created the session but did not send it */
    CREATED,
    /** The verifier sent the request to the subject */
    REQUESTED,
    /** The subject responded to the request */
    ACCEPTED,
    /** The subject rejected the request */
    REJECTED,
    /** The verifier has requested IPv8 verification */
    VERIFYING,
    /** The IPv8 verification has been completed */
    VERIFIED,
    /** The user aborted the verification */
    ABORTED,
    /** An error occurred */
    ERROR,
}

export enum OWVerifyErrorType {
    /** When connection has been lost with the counter party */
    DISCONNECTED,
    /** When the counter party fails the protocol */
    FOUL,
}

export class OWVerifyError {
    static disconnected = (message: string) => new OWVerifyError(OWVerifyErrorType.DISCONNECTED, message);

    static foul = (message: string) => new OWVerifyError(OWVerifyErrorType.FOUL, message);

    constructor(readonly type: OWVerifyErrorType, readonly message: string) { }
}

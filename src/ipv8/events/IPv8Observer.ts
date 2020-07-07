import debug from "debug";
import { IPv8API } from '../api/IPv8API';
import { Attestation, InboundAttestationRequest, InboundVerificationRequest, VerificationOutputPair } from "../api/types";
import { AsyncListPoller } from "./AsyncListPoller";

/** Observes the IPv8 API for new information and fires corresponding events */
export class IPv8Observer {

    readonly peerPoller: AsyncListPoller<string>;
    readonly attReqPoller: AsyncListPoller<InboundAttestationRequest>;
    readonly attPoller: AsyncListPoller<Attestation>;
    readonly verifReqPoller: AsyncListPoller<InboundVerificationRequest>;
    readonly verifPoller: AsyncListPoller<VerificationOutputPair>;

    get onPeerFound() { return this.peerPoller.hook.on };
    get onAttestationRequest() { return this.attReqPoller.hook.on };
    get onAttestation() { return this.attPoller.hook.on };
    get onVerificationRequest() { return this.verifReqPoller.hook.on };
    get onVerification() { return this.verifPoller.hook.on };

    public reconnecting = false;
    protected active = false;

    protected log = debug("ow-ssi:ipv8:observer");

    constructor(protected api: IPv8API, protected pollIntervalInMillis = 500, protected terminateOnDisconnect = false) {

        this.peerPoller = new AsyncListPoller(() => this.api.listPeers().catch(this.handleOffline));
        this.attReqPoller = new AsyncListPoller(() => this.api.listAttestationRequests().catch(this.handleOffline));
        this.attPoller = new AsyncListPoller(() => this.api.listAttestations().catch(this.handleOffline));
        this.verifReqPoller = new AsyncListPoller(() => this.api.listVerificationRequests().catch(this.handleOffline));
        this.verifPoller = new AsyncListPoller(() => this.api.listVerificationOutputs().catch(this.handleOffline));
    }

    get isRunning() {
        return this.active;
    }

    /** IPv8 is only ready when it has found at least one peer. */
    public awaitReady(timeoutInMillis = 3000) {
        let done = false;
        let timer;
        return new Promise((resolve, reject) => {
            const readyPoller = new AsyncListPoller<string>(() => this.api.listPeers().catch(this.handleOffline));
            readyPoller.hook.on((p) => {
                if (!done && p.length > 0) {
                    done = true;
                    readyPoller.stop();
                    clearTimeout(timer);
                    resolve();
                }
            })
            readyPoller.start(200);
            if (timeoutInMillis > 0) {
                timer = setTimeout(() => {
                    readyPoller.stop();
                    done = true;
                    reject(new Error(`IPv8 not ready, waited ${timeoutInMillis} millis.`));
                }, timeoutInMillis);
            }
        })
    }

    public start() {
        this.log("Observer starting");
        const ms = this.pollIntervalInMillis;
        this.active = true;
        this.peerPoller.start(ms);
        this.attReqPoller.start(ms);
        this.attPoller.start(ms);
        this.verifReqPoller.start(ms);
        this.verifPoller.start(ms);
    }

    /** Deactivates */
    public stop() {
        if (this.active) {
            this.log("Observer stopped");
            this.active = false;
            this.stopPollers();
        } else {
            this.log("Observer already stopped");
        }
    }

    /** Stop polling, because deactivated, or whilst reconnecting. */
    protected stopPollers() {
        this.peerPoller.stop();
        this.attReqPoller.stop();
        this.attPoller.stop();
        this.verifReqPoller.stop();
        this.verifPoller.stop();
    }

    protected handleOffline = () => {
        if (this.active && !this.reconnecting) { // handle this only once

            if (this.terminateOnDisconnect) {
                this.log("IPv8 seems to be offline, terminating.");
                this.stopPollers();
            } else {
                this.log("IPv8 seems to be offline, attempting to reconnect.");
                this.stopPollers();
                this.attemptToReconnect();
            }

        }

        return [];
        // throw new Error("IPv8 Offline");
    }

    protected attemptToReconnect() {
        this.reconnecting = true;
        setTimeout(async () => {
            this.log("Reconnecting..")
            if (await this.api.verifyOnline()) {
                if (this.active) {
                    this.log("Reconnected to IPv8, polls restarting.");
                    this.start();
                }
            } else if (this.active) {
                this.attemptToReconnect();
            }
        }, this.pollIntervalInMillis);
    }

}

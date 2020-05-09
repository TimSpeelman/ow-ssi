import { IPv8API } from '../api/IPv8API';
import { Attestation, InboundAttestationRequest, InboundVerificationRequest, VerificationOutputPair } from "../api/types";
import { AsyncListPoller } from "./AsyncListPoller";

/** Observes the IPv8 API for new information and fires corresponding events */
export class IPv8Observer {

    protected peerPoller: AsyncListPoller<string>;
    protected attReqPoller: AsyncListPoller<InboundAttestationRequest>;
    protected attPoller: AsyncListPoller<Attestation>;
    protected verifReqPoller: AsyncListPoller<InboundVerificationRequest>;
    protected verifPoller: AsyncListPoller<VerificationOutputPair>;

    get onPeerFound() { return this.peerPoller.hook.on };
    get onAttestationRequest() { return this.attReqPoller.hook.on };
    get onAttestation() { return this.attPoller.hook.on };
    get onVerificationRequest() { return this.verifReqPoller.hook.on };
    get onVerification() { return this.verifPoller.hook.on };

    public reconnecting = false;
    protected active = false;

    constructor(private api: IPv8API, private pollIntervalInMillis = 500, private terminateOnDisconnect = false) {

        this.peerPoller = new AsyncListPoller(() => this.api.listPeers().catch(this.handleOffline));
        this.attReqPoller = new AsyncListPoller(() => this.api.listAttestationRequests().catch(this.handleOffline));
        this.attPoller = new AsyncListPoller(() => this.api.listAttestations().catch(this.handleOffline));
        this.verifReqPoller = new AsyncListPoller(() => this.api.listVerificationRequests().catch(this.handleOffline));
        this.verifPoller = new AsyncListPoller(() => this.api.listVerificationOutputs().catch(this.handleOffline));
    }

    get isRunning() {
        return this.active;
    }

    public start() {
        console.log("Observer starting");
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
            console.log("Observer stopped");
            this.active = false;
            this.stopPollers();
        } else {
            console.log("Observer already stopped");
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
                console.log("IPv8 seems to be offline, terminating.");
                this.stopPollers();
            } else {
                console.log("IPv8 seems to be offline, attempting to reconnect.");
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
            console.log("Reconnecting..")
            if (await this.api.verifyOnline()) {
                if (this.active) {
                    console.log("Reconnected to IPv8, polls restarting.");
                    this.start();
                }
            } else if (this.active) {
                this.attemptToReconnect();
            }
        }, this.pollIntervalInMillis);
    }

}

import debug from "debug";
import { IPv8API } from "../api/IPv8API";
import { IPv8Observer } from "../events/IPv8Observer";

const log = debug("ow-ssi:ipv8:peer-service");

/** Peer Service will find a peer by its id, or throw an error. */
export class PeerService {
    private awaits: { [peerId: string]: Callback[] } = {};

    constructor(
        private api: IPv8API,
        private observer: IPv8Observer,
    ) {
        observer.onPeerFound(peerId => {
            if (peerId in this.awaits) {
                // Invoke all callbacks waiting for this peer in order of registering.
                this.awaits[peerId].forEach(fn => fn());
            }
        })
    }

    /** Finds a peer by Member ID, or rejects after a timeout */
    findPeer(peerId: string, timeoutInMillis = 10000): Promise<boolean> {
        if (!this.observer.isRunning) {
            throw new Error("IPv8 observer is not running.");
        }
        return new Promise(async (resolve, reject) => {
            const peers = await this.api.listPeers();

            // If the peer is found, return true
            if (peers.indexOf(peerId) >= 0) {
                resolve(true);

            } else { // Otherwise, try finding it.
                log("Trying to find peer", peerId)
                let timer;

                // Once the peer is found, clear the timer and resolve.
                const callback = () => {
                    clearTimeout(timer);
                    resolve(true);
                }

                // When the time is up, remove from the waiting list, reject.
                timer = setTimeout(() => {
                    this.awaits[peerId] = this.awaits[peerId].filter(cb => cb !== callback);
                    reject(new Error(`Timeout. Could not locate peer ${peerId}.`));
                }, timeoutInMillis)

                // Add the callback to waiting list.
                this.awaits[peerId] = [...(this.awaits[peerId] || []), callback];

                // Start the search
                this.api.connectPeer(peerId).catch((e) => {
                    clearTimeout(timer);
                    reject(e);
                });
            }
        })
    }
}

type Callback = () => void;

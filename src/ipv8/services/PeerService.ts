import { IPv8API } from "../api/IPv8API";
import { IPv8Observer } from "../events/IPv8Observer";

/** Peer Service will find a peer by its id, or throw an error. */
export class PeerService {
    private awaits: { [peerId: string]: Callback[] } = {};

    constructor(
        private api: IPv8API,
        observer: IPv8Observer,
    ) {
        observer.onPeerFound(peerId => {
            if (peerId in this.awaits) {
                // Invoke all callbacks waiting for this peer in order of registering.
                this.awaits[peerId].forEach(fn => fn());
            }
        })
    }

    /** Finds a peer by Member ID, or rejects after a timeout */
    findPeer(peerId: string, timeoutInMillis = 1000): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            const peers = await this.api.listPeers();

            // If the peer is found, return true
            if (peers.indexOf(peerId) >= 0) {
                resolve(true);

            } else { // Otherwise, try finding it.
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
                })

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

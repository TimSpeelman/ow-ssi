import debug from "debug";
import { IPv8API } from "../../ipv8/api/IPv8API";
import { queryString } from "../../util/queryString";

const log = debug("ow-ssi:ow:api");

/**
 * A client for the OpenWallet API, which extends the IPv8 Attestation API
 */
export class OpenWalletAPI extends IPv8API {

    /** Get all messages in the inbox */
    public getMessageInbox(): Promise<Message[]> {
        return this.api
            .get('/msg/inbox')
            .then(res => res.data)
    }

    /** Send a message to a peer */
    public sendMessage(mid: string, message: string): Promise<boolean> {
        return this.api
            .get('/msg/send?' + queryString({ message, mid }))
            .then(res => res.data.mid)
    }

    /** List all peers' mids that are in this community */
    public getMsgCommunityPeers(): Promise<string[]> {
        return this.api
            .get('/msg/peers')
            .then(res => res.data)
    }

}

interface Message {
    sender_mid_b64: string
    message: string
    received_at: number
}

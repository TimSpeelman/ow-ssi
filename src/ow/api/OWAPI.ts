import debug from "debug";
import { IPv8API } from "../../ipv8/api/IPv8API";
import { queryString } from "../../util/queryString";


/**
 * A client for the OpenWallet API, which extends the IPv8 Attestation API
 */
export class OWAPI extends IPv8API {

    protected log = debug("ow-ssi:ow:api");

    /** Get all messages in the inbox */
    public getMessageInbox(): Promise<OWMessage[]> {
        return this.api
            .get('/msg/inbox')
            .then(res => res.data)
    }

    /** Send a message to a peer */
    public sendMessage(mid: string, message: string): Promise<boolean> {
        this.log(`Sending message to ${mid}: ${message}`);
        return this.api
            .get('/msg/send?' + queryString({ message, mid }))
            .then(res => res.data.success)
    }

    /** List all peers' mids that are in this community */
    public getMsgCommunityPeers(): Promise<string[]> {
        return this.api
            .get('/msg/peers')
            .then(res => res.data)
    }

}

export interface OWMessage {
    sender_mid_b64: string
    message: string
    received_at: number
}

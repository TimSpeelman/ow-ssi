import debug from "debug";
import { IPv8API } from "../../ipv8/api/IPv8API";
import { queryString } from "../../util/queryString";
import { OWAttestedAttr } from "../protocol/types";


/**
 * A client for the OpenWallet API, which extends the IPv8 Attestation API
 */
export class OWAPI extends IPv8API {

    protected log = debug("ow-ssi:ow:api");

    /** Get all attributes */
    public listAttributes(): Promise<OWAttestedAttr[]> {
        return this.api
            .get("/attributes").then((d) => d.data)
    }

    /** Store an attribute */
    public storeAttribute(attribute: OWAttestedAttr) {
        return this.api
            .post("/attributes", attribute)
    }

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

    /** Delete a message */
    public deleteMessage(id: string): Promise<boolean> {
        this.log(`Deleting message ${id}.`);
        return this.api
            .delete('/msg/delete?' + queryString({ id }))
            .then(res => res.data.success)
    }
}

export interface OWMessage {
    id: string
    sender_mid_b64: string
    message: string
    received_at: number
}

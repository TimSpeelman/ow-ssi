import debug from "debug";
import { OWAPI, OWMessage } from "../api/OWAPI";
import { OWObserver } from "./OWObserver";

export class OWMessageDispatch {

    protected handlers: MessageHandler[] = [];

    protected log = debug("ow-ssi:msg-dispatch")

    constructor(protected observer: OWObserver, protected api: OWAPI) {
        this.register();
    }

    addHandler(messageHandler) {
        this.handlers.push(messageHandler);
    }

    protected register() {
        this.observer.onMessageFound((msg) => {
            const handled = this.handlers.find(h => h(msg))
            if (!handled) {
                this.log("Warning: Unhandled Message from " + msg.sender_mid_b64 + ": ", msg)
            } else {
                this.api.deleteMessage(msg.id)
                    .then((s) => {
                        this.log(s ? `Deleted message ${msg.id}.` : `Could not delete message ${msg.id}.`)
                    })
                    .catch((e) => {
                        this.log(`Error when deleting message ${msg.id}.`, e)
                    })
            }
        })
    }

}

export type MessageHandler = (message: OWMessage) => boolean;

export interface OWMessageHandler {
    handleMessage: MessageHandler;
}

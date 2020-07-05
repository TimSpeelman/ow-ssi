import { OWMessage } from "../api/OWAPI";
import { OWObserver } from "./OWObserver";

export class OWMessageDispatch {

    protected handlers: MessageHandler[] = [];

    constructor(protected observer: OWObserver) {
        this.register();
    }

    addHandler(messageHandler) {
        this.handlers.push(messageHandler);
    }

    protected register() {
        this.observer.onMessageFound((msg) => {
            if (!this.handlers.find(h => h(msg))) {
                console.warn("Warning: Unhandled Message from " + msg.sender_mid_b64)
            }
        })
    }

}

export type MessageHandler = (message: OWMessage) => boolean;

export interface OWMessageHandler {
    handleMessage: MessageHandler;
}

import debug from "debug";
import { IPv8Observer } from "../../../modules/browser/ipv8";
import { AsyncListPoller } from "../../ipv8/events/AsyncListPoller";
import { OWAPI, OWMessage } from "../api/OWAPI";

// TODO Perhaps composition is better than inheritance here
export class OWObserver extends IPv8Observer {

    readonly msgPoller: AsyncListPoller<OWMessage>;

    get onMessageFound() { return this.msgPoller.hook.on };

    protected log = debug("ow-ssi:ow:observer");

    constructor(protected api: OWAPI, protected pollIntervalInMillis = 500, protected terminateOnDisconnect = false) {
        super(api, pollIntervalInMillis, terminateOnDisconnect);
        this.msgPoller = new AsyncListPoller(() => this.api.getMessageInbox().catch(this.handleOffline));
    }

    public start() {
        super.start();
        const ms = this.pollIntervalInMillis;
        this.msgPoller.start(ms);
    }

    protected stopPollers() {
        super.stopPollers();
        this.msgPoller.stop();
    }

}


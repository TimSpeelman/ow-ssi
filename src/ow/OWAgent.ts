import { OWAttestee, OWAttester, OWVerifiee, OWVerifier, OWVerifyRequestResolver, OWVerifyResponse, ResolutionResult } from "../../modules/browser/ow";
import { IPv8Service } from "../ipv8/IPv8Service";
import { OWAPI } from "./api/OWAPI";
import { OWMessageDispatch } from "./events/OWMessageDispatch";
import { OWObserver } from "./events/OWObserver";
import { IOWAttributeRepository } from "./IOWAttributeRepository";
import { OWVee } from "./protocol/OWVee";
import { OWVer } from "./protocol/OWVer";
import { OWVerification, OWVerificationStatus } from "./protocol/OWVerification";
import { AttributeRepository } from "./resolution/AttributeRepository";


export class OWAgent {

    public mid: string;
    public api: OWAPI;
    public owObserver: OWObserver;
    public vee: OWVee;
    public ver: OWVer;

    public service: IPv8Service;
    public repo: IOWAttributeRepository;
    public resolver: OWVerifyRequestResolver;
    public dispatch: OWMessageDispatch;
    public attester: OWAttester;
    public attestee: OWAttestee;
    public verifier: OWVerifier;
    public verifiee: OWVerifiee;

    public verifyRequestHandler: OWNewVerifyRequestHandler = () => Promise.resolve(false);

    /** By default: automatically verify once the response satisfies the request */
    public verifyResponseHandler: OWVerifyResponseHandler = () => Promise.resolve(true);

    constructor(baseURL: string, pollIntervalInMillis = 100, terminateOnDisconnect = false) {
        this.api = new OWAPI(baseURL);
        this.owObserver = new OWObserver(this.api, pollIntervalInMillis, terminateOnDisconnect);
        this.service = new IPv8Service(baseURL, pollIntervalInMillis);

        this.repo = new AttributeRepository(this.api);
        this.dispatch = new OWMessageDispatch(this.owObserver);
        this.dispatch.addHandler((message) => this.vee.handleRequestMessage(message))
        this.dispatch.addHandler((message) => this.ver.handleResponseMessage(message))

        this.attester = new OWAttester(this.service.attesterService)
        this.attestee = new OWAttestee(this.service.attesteeService)
        this.verifier = new OWVerifier(this.service.verifierService)
        this.verifiee = new OWVerifiee(this.service.verifieeService)
    }

    async start(timeoutInMillis = 3000) {
        await this.owObserver.awaitReady(timeoutInMillis)
        this.owObserver.start();
        this.service.start();
        this.mid = await this.api.getMyId();

        this.vee = new OWVee(this.mid, this.api, this.service.verifieeService); // FIXME mid
        this.ver = new OWVer(this.mid, this.api, this.service.verifierService); // FIXME mid
        this.resolver = new OWVerifyRequestResolver(this.mid, this.repo);  // FIXME mid

        this.setupVerifiee();
    }

    protected setupVerifiee() {
        this.vee.newSessionHook.on((session) => {
            session.statusHook.on((status) => {
                // When a request comes in..
                if (status === OWVerificationStatus.REQUESTED) {
                    // This is first resolved
                    this.resolver.resolveRequest(session.request).then((result) => {
                        const response = result.response;

                        // Then the user is asked for input
                        return this.verifyRequestHandler(session, result).then((answer) => {
                            if (answer === false) {
                                this.vee.rejectSession(session);
                            } else {
                                return this.vee.acceptSession(session, answer);
                            }
                        })
                    }).catch((e) => console.error("ERROR", e))
                }
            })
        })
    }

}


export type OWNewVerifyRequestHandler = (session: OWVerification, resolutionResult: ResolutionResult) =>
    Promise<OWVerifyResponse | false>

/** The handler returns true if the verification should proceed */
export type OWVerifyResponseHandler = (session: OWVerification) =>
    Promise<boolean>

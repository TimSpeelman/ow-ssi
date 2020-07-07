import { OWAttestee, OWAttester, OWVerifiee, OWVerifier, OWVerifyRequestResolver, OWVerifyResponse, ResolutionResult } from "../../modules/browser/ow";
import { OWAPI } from "./api/OWAPI";
import { OWMessageDispatch } from "./events/OWMessageDispatch";
import { IOWAttributeRepository } from "./IOWAttributeRepository";
import { OWService } from "./OWService";
import { OWAttestSession, OWAttestStatus } from "./protocol/OWAttestSession";
import { OWTee } from "./protocol/OWTee";
import { OWTer } from "./protocol/OWTer";
import { OWVee } from "./protocol/OWVee";
import { OWVer } from "./protocol/OWVer";
import { OWVerification, OWVerificationStatus } from "./protocol/OWVerification";
import { AttributeRepository } from "./resolution/AttributeRepository";


export class OWAgent {

    public mid: string;
    public api: OWAPI;
    public vee: OWVee;
    public ver: OWVer;
    public tee: OWTee;
    public ter: OWTer;

    public service: OWService;
    public repo: IOWAttributeRepository;
    public resolver: OWVerifyRequestResolver;
    public dispatch: OWMessageDispatch;
    public attester: OWAttester;
    public attestee: OWAttestee;
    public verifier: OWVerifier;
    public verifiee: OWVerifiee;

    public verifyRequestHandler: OWNewVerifyRequestHandler = () => Promise.resolve(false);
    public attestOfferHandler: OWNewAttestOfferHandler = () => Promise.resolve(true);

    /** By default: automatically verify once the response satisfies the request */
    public verifyResponseHandler: OWVerifyResponseHandler = () => Promise.resolve(true);


    constructor(protected baseURL: string, pollIntervalInMillis = 100, terminateOnDisconnect = false) {
        this.api = new OWAPI(baseURL);
        this.service = new OWService(baseURL, pollIntervalInMillis);

        this.repo = new AttributeRepository(this.api);
        this.dispatch = new OWMessageDispatch(this.service.observer, this.api);
        this.dispatch.addHandler((message) => this.vee.handleRequestMessage(message))
        this.dispatch.addHandler((message) => this.ver.handleResponseMessage(message))
        this.dispatch.addHandler((message) => this.tee.handleOfferMessage(message))
        this.dispatch.addHandler((message) => this.ter.handleResponseMessage(message))

        this.attester = new OWAttester(this.service.attesterService)
        this.attestee = new OWAttestee(this.service.attesteeService)
        this.verifier = new OWVerifier(this.service.verifierService)
        this.verifiee = new OWVerifiee(this.service.verifieeService)
    }

    async start(timeoutInMillis = 3000) {
        if (!await this.api.verifyOnline()) {
            throw new Error(`IPv8 (at ${this.baseURL}) is offline.`);
        }

        // Wait until IPv8 has found peers. Otherwise it is useless? TODO
        await this.service.startWhenReady(timeoutInMillis);

        this.mid = await this.api.getMyId();

        this.vee = new OWVee(this.mid, this.api, this.service.verifieeService); // FIXME mid
        this.ver = new OWVer(this.mid, this.api, this.service.verifierService); // FIXME mid
        this.tee = new OWTee(this.mid, this.api, this.service.attesteeService, this.repo); // FIXME mid
        this.ter = new OWTer(this.mid, this.api, this.service.attesterService); // FIXME mid
        this.resolver = new OWVerifyRequestResolver(this.mid, this.repo);  // FIXME mid

        this.setupVerifiee();
        this.setupAttestee();
    }

    stop() {
        this.service.stop();
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

    protected setupAttestee() {
        this.tee.newSessionHook.on((session) => {
            session.statusHook.on((status) => {
                // When a request comes in..
                if (status === OWAttestStatus.OFFERED) {

                    // Then the user is asked for input
                    return this.attestOfferHandler(session).then((answer) => {
                        if (answer === false) {
                            this.tee.rejectSession(session);
                        } else {
                            return this.tee.acceptSession(session);
                        }
                    })
                }
            })
        })
    }

}


export type OWNewVerifyRequestHandler = (session: OWVerification, resolutionResult: ResolutionResult) =>
    Promise<OWVerifyResponse | false>

export type OWNewAttestOfferHandler = (session: OWAttestSession) =>
    Promise<boolean>

/** The handler returns true if the verification should proceed */
export type OWVerifyResponseHandler = (session: OWVerification) =>
    Promise<boolean>

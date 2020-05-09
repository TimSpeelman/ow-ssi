import axios from 'axios';
import { IPv8API } from '../../ipv8/api/IPv8API';
import { Attribute } from '../../ipv8/services/types/Attribute';
import { IAttesteeService } from "../../ipv8/services/types/IAttesteeService";
import { IVerifieeService } from '../../ipv8/services/types/IVerifieeService';
import { OWAttestee } from "../../ow/protocol/OWAttestee";
import { OWVerifiee } from "../../ow/protocol/OWVerifiee";
import { AttestedAttr, OWAttestOffer, OWVerifyRequest, OWVerifyResponse } from "../../ow/protocol/types";
import { IVerifyRequestResolver } from "../../ow/resolution/types";
import { ServerDescriptor } from "../../recipe/server/IAttestationServerRESTAPI";
import { ClientProcedure, PeerId } from '../../types/types';
import { arrayContentsEqual } from "../../util/mapEqual";
import { Validate } from '../../util/validate';
import { HttpAPIGateway } from './HttpAPIGateway';

export class AttestationClient {
    public config = {
        allowVerificationTimeoutMillis: 10000
    }

    constructor(
        private me: PeerId,
        private api: IPv8API,
        public verifieeService: IVerifieeService,
        public attesteeService: IAttesteeService,
        public resolver: IVerifyRequestResolver,
        private logger: (...args: any[]) => any = console.log
    ) { }

    stop() {
        // @ts-ignore FIXME
        this.verifieeService.observer.stop();
    }


    public async getServerDetails(http_address: string): Promise<ServerDescriptor> {
        return new HttpAPIGateway(axios, http_address).about();
    }

    /**
     * Run an OWAttestationProcedure
     * @param procedure The procedure description
     * @param credential_values The values of all required credentials
     */
    public async execute(
        procedure: ClientProcedure,
        userConsentOnData: (offer: OWAttestOffer) => Promise<boolean> = null,
        onStatusChange: (status: Status) => any = () => { },
    ): Promise<OWResponse> {
        const { desc, server } = procedure
        try {
            this.log(`Start executing procedure ${procedure.desc.procedure_name}.`);

            // Simulate VerifyRequest (TODO clean up)
            const vReq: OWVerifyRequest = {
                attributes: desc.requirements.map(a => ({
                    name: a,
                    format: "id_metadata", // FIXME,
                    ref: a,
                })),
                ref: "FIXME",
                verifier_id: server.mid_b64,
            }

            const verifiee = new OWVerifiee(this.verifieeService);
            const validUntil = Date.now() + 10000; // FIXME

            verifiee.allowVerification(vReq, validUntil);

            // TODO Replace with Resolve VReq
            onStatusChange(Status.FETCHING_LOCAL_CREDENTIALS);

            const resolve = await this.resolver.resolveRequest(vReq);
            if (resolve.status !== "success") {
                throw new Error("OWAttest failed. Could not resolve verification request.");
            }

            onStatusChange(Status.FETCHING_DATA);
            const offer = await this.fetchDataAtProvider(procedure, resolve.response) // Will receive AttestOffer

            // Abort if user does not consent with provided data
            if (userConsentOnData && !await userConsentOnData(offer)) {
                return null;
            }

            onStatusChange(Status.REQUESTING_ATTESTATION);

            const attestee = new OWAttestee(this.attesteeService);
            const attributes = await attestee.requestAttestationByOffer(offer);

            onStatusChange(Status.COMPLETE);
            return { attributes }
        } catch (err) {
            throw new Error(`OWAttest failed. Status: ${err.errno}. Message: ${err.message}`);
        }
    }

    /**
     * Request the OWAttestationServer to stage our attributes and
     * verify our credentials if needed, passing the credential data.
     */
    protected async fetchDataAtProvider(
        procedure: ClientProcedure,
        verifyResponse: OWVerifyResponse,
    ): Promise<OWAttestOffer> {
        const procedure_name = procedure.desc.procedure_name;
        const request = {
            procedure_id: procedure_name,
            mid_b64: this.me.mid_b64,
            verify_response: verifyResponse,
        }
        this.log(`Requesting data for procedure ${procedure_name} at provider...`);
        const response = await new HttpAPIGateway(axios, procedure.server.http_address).procedure(request);
        const data = this.validateReceivedDataOrThrow(procedure, response.offer);
        this.log(`Received data.`, data);
        return response.offer;
    }

    /**
     * We don't trust the data provided by the server. Hence first validate it.
     */
    protected validateReceivedDataOrThrow(procedure: ClientProcedure, receivedData: OWAttestOffer): Attribute[] { // TODO: Move to Attestee
        const { arrayWithEach, many, hasKey } = Validate

        const attestee = new OWAttestee(this.attesteeService);
        const errors = attestee.validateOffer(receivedData);
        if (errors.length > 0) {
            throw new Error(`Server response malformed: ${errors[0]}`);
        }

        const array: Attribute[] = receivedData.attributes.map(a => ({
            attribute_name: a.name,
            attribute_value: a.value
        }))

        if (!arrayContentsEqual(array.map(d => d.attribute_name), procedure.desc.attributes.map(a => a.name))) {
            throw new Error(`Server response malformed: unexpected or missing attributes.`);
        }

        return array;
    }

    protected log(...args: any[]) {
        if (this.logger) {
            this.logger('[AttestationClient]', ...args)
        }
    }
}

export interface OWResponse {
    attributes: AttestedAttr[]
}

export enum Status {
    FETCHING_LOCAL_CREDENTIALS = "FETCHING_LOCAL_CREDENTIALS",
    FETCHING_DATA = "FETCHING_DATA",
    REQUESTING_ATTESTATION = "REQUESTING_ATTESTATION",
    COMPLETE = "COMPLETE"
}

import axios from 'axios';
import { IPv8API } from '../../ipv8/api/IPv8API';
import { Attestation } from "../../ipv8/api/types";
import { Attribute } from '../../ipv8/services/types/Attribute';
import { AttestationSpec, IAttesteeService } from "../../ipv8/services/types/IAttesteeService";
import { IVerifieeService } from '../../ipv8/services/types/IVerifieeService';
import { OWAttestOffer } from "../../ow/protocol/types";
import { ServerDescriptor } from "../../recipe/server/IAttestationServerRESTAPI";
import { Dict } from '../../types/Dict';
import { ClientProcedure, Credential, PeerId } from '../../types/types';
import { arrayContentsEqual } from "../../util/mapEqual";
import { strlist } from '../../util/strlist';
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
        credential_values: Dict<string>,
        userConsentOnData: (data: Attribute[]) => Promise<boolean> = null,
        onStatusChange: (status: Status) => any = () => { },
    ): Promise<OWResponse> {
        const { desc, server } = procedure
        try {
            this.log(`Start executing procedure ${procedure.desc.procedure_name}.`);
            this.grantVerificationOfCredentials(server.mid_b64, desc.requirements); // Todo OWVerifiee

            // TODO Replace with Resolve VReq
            onStatusChange(Status.FETCHING_LOCAL_CREDENTIALS);
            const credentials = await this.fetchLocalCredentials(desc.requirements, credential_values)

            onStatusChange(Status.FETCHING_DATA);
            const data = await this.fetchDataAtProvider(procedure, credentials) // Will receive AttestOffer

            // Abort if user does not consent with provided data
            if (userConsentOnData && !await userConsentOnData(data)) {
                return null;
            }

            onStatusChange(Status.REQUESTING_ATTESTATION);
            const attestations = await this.requestAndAwaitAttestations(procedure) // Attest by Offer

            onStatusChange(Status.COMPLETE);
            return { data, attestations }
        } catch (err) {
            throw new Error(`OWAttest failed. Status: ${err.errno}. Message: ${err.message}`);
        }
    }

    /** Fetch the hashes from the client's IPv8 belonging to specific attributes. */
    protected async fetchLocalCredentials(
        credential_names: string[],
        values: Dict<string>
    ): Promise<Credential[]> {
        if (credential_names.length === 0) {
            return [];
        }
        this.log(`Fetching credential hashes of ${strlist(credential_names)}...`)
        const promises = credential_names.map(async cName => {
            const attribute_hash = await this.fetchCredentialHashOrThrow(cName)
            this.log(`Received hash for ${cName}: ${attribute_hash}.`)
            return {
                attribute_name: cName,
                attribute_hash,
                attribute_value: values[cName],
            }
        })
        const result = await Promise.all(promises)
        this.log(`Received all credential hashes.`)
        return result;
    }

    /** 
     * Check that we have an attestation for a given attribute.
     * @throws If an attribute hash is missing.
     */
    protected async fetchCredentialHashOrThrow(attribute_name: string): Promise<string> {
        const attestations = await this.api.listAttestations()
        const attestation = attestations.find(a => a.attribute_name === attribute_name)
        if (!attestation) {
            throw new Error(`Missing hash for attribute ${attribute_name}.`)
        }
        return attestation.attribute_hash
    }

    /**
     * Request the OWAttestationServer to stage our attributes and
     * verify our credentials if needed, passing the credential data.
     */
    protected async fetchDataAtProvider(
        procedure: ClientProcedure,
        credentials: Credential[]
    ): Promise<Attribute[]> {
        const procedure_name = procedure.desc.procedure_name;
        const request = {
            procedure_id: procedure_name,
            mid_b64: this.me.mid_b64,
            credentials
        }
        this.log(`Requesting data for procedure ${procedure_name} at provider...`);
        const response = await new HttpAPIGateway(axios, procedure.server.http_address).procedure(request);
        const data = this.validateReceivedDataOrThrow(procedure, response.offer);
        this.log(`Received data.`, data);
        return data;
    }

    /**
     * Allow incoming verification requests from the Provider for the given attributes.
     */
    async grantVerificationOfCredentials(mid_b64: string, attributeNames: string[]) {
        if (attributeNames.length === 0) {
            return [];
        }
        this.log(`Staged verification for '${mid_b64}' of attributes ${strlist(attributeNames)}.`);
        const verificationValidUntil = Date.now() + this.config.allowVerificationTimeoutMillis
        await this.verifieeService.stageVerification(
            mid_b64,
            attributeNames,
            verificationValidUntil
        )
        this.log(`Verification complete.`);
    }

    /**
     * We don't trust the data provided by the server. Hence first validate it.
     */
    protected validateReceivedDataOrThrow(procedure: ClientProcedure, receivedData: OWAttestOffer): Attribute[] { // TODO: Move to Attestee
        const { arrayWithEach, many, hasKey } = Validate
        // FIXME Validate OWAttestOffer
        // const validator = arrayWithEach(many([hasKey('attribute_name'), hasKey('attribute_value')]))
        // const error = validator(receivedData)
        // if (error !== false) {
        // throw new Error(`Server response malformed: ${error}.`);
        // }
        const array: Attribute[] = receivedData.attributes.map(a => ({
            attribute_name: a.name,
            attribute_value: a.value
        }))

        if (!arrayContentsEqual(array.map(d => d.attribute_name), procedure.desc.attributes.map(a => a.name))) {
            throw new Error(`Server response malformed: unexpected or missing attributes.`);
        }

        return array;
    }

    protected async requestAndAwaitAttestations(procedure: ClientProcedure): Promise<Attestation[]> {
        const attrs: AttestationSpec[] = procedure.desc.attributes.map(a =>
            ({ attribute_name: a.name, id_format: a.type }))

        this.log("Requesting all attestations..")
        const result = await this.attesteeService.requestAttestation(procedure.server.mid_b64, attrs);
        this.log("Received all attestations.");
        return result;
    }

    protected log(...args: any[]) {
        if (this.logger) {
            this.logger('[AttestationClient]', ...args)
        }
    }
}

export interface OWResponse {
    data: Attribute[]
    attestations: Attestation[]
}

export enum Status {
    FETCHING_LOCAL_CREDENTIALS = "FETCHING_LOCAL_CREDENTIALS",
    FETCHING_DATA = "FETCHING_DATA",
    REQUESTING_ATTESTATION = "REQUESTING_ATTESTATION",
    COMPLETE = "COMPLETE"
}

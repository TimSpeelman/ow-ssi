import { IPv8Service } from '../../ipv8/IPv8Service';
import { AttesterService } from "../../ipv8/services/AttesterService";
import { VerifierService } from "../../ipv8/services/VerifierService";
import { Dict } from '../../types/Dict';
import { ProcedureConfig } from '../../types/types';
import { HttpServer } from './HttpServer';
import { ServerDescriptor } from "./IAttestationServerRESTAPI";

export class AttestationServer {

    private ipv8: IPv8Service
    private attesterService: AttesterService
    private verifierService: VerifierService
    private httpServer: HttpServer;

    constructor(
        private procedures: Dict<ProcedureConfig>,
        private description: ServerDescriptor,
        private config: AttestationServerConfig,
        private timeInMillis = Date.now
    ) { }

    public async start() {
        this.ipv8 = new IPv8Service(this.config.ipv8_url)

        if (!(await this.ipv8.api.verifyOnline())) {
            throw new Error("IPv8 service is offline");
        } else {
            this.attesterService = this.ipv8.attesterService;
            this.verifierService = this.ipv8.verifierService;

            this.httpServer = new HttpServer(
                this.procedures,
                this.description,
                this.config.http_port,
                this.ipv8,
            )

            // Need to start polling
            this.ipv8.start()
            this.httpServer.start()
        }
    }

    public stop() {
        if (this.ipv8) this.ipv8.stop();
    }

}

export interface AttestationServerConfig {
    ipv8_url: string
    http_port: number
    mid_b64: string
}

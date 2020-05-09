import { AxiosError, AxiosInstance } from 'axios';
import { OWAttestOffer } from "../../ow/types";
import { toHttpError } from "../../util/HttpError";
import { IAttestationServerRESTAPI, ReqProcedure, ServerDescriptor } from '../server/IAttestationServerRESTAPI';

export class HttpAPIGateway implements IAttestationServerRESTAPI {
    constructor(private axios: AxiosInstance, private server_http_address: string) { }

    public about(): Promise<ServerDescriptor> {
        return this.axios
            .get(`${this.server_http_address}/about`)
            .then((res) => res.data)
            .catch(this.handleAxiosError.bind(this))
    }

    public procedure(req: ReqProcedure): Promise<{ offer: OWAttestOffer }> {
        return this.axios
            .post(`${this.server_http_address}/procedure`, req)
            .then((response) => response.data)
            .catch(this.handleAxiosError.bind(this))
    }

    protected handleAxiosError(error: AxiosError) {
        throw toHttpError(error);
    }
}

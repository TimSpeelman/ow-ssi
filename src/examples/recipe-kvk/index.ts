import { AttestationServer } from '../../recipe/server/AttestationServer';
import { kvkServerPeer } from './config';
import { KVKDescription } from "./description";
import { KVKProcedures } from './procedures';

const options = {
    ipv8_url: kvkServerPeer.ipv8_url,
    http_port: kvkServerPeer.rest_port,
    mid_b64: kvkServerPeer.mid_b64,
}

const server = new AttestationServer(KVKProcedures, KVKDescription, options)

server.start()

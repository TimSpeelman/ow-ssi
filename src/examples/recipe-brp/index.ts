import { AttestationServer } from '../../recipe/server/AttestationServer';
import { brpServerPeer } from "./config";
import { BRPDescription } from "./description";
import { BRPProcedures } from "./procedures";

const options = {
    ipv8_url: brpServerPeer.ipv8_url,
    http_port: brpServerPeer.rest_port,
    mid_b64: brpServerPeer.mid_b64,
}

const server = new AttestationServer(BRPProcedures, BRPDescription, options)

server.start()

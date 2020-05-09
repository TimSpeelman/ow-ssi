import { loadTemporaryIPv8Configuration } from "../../util/ipv8conf"
import { ports } from "../ports"

const brpServer = loadTemporaryIPv8Configuration("brp")

export const brpServerPeer = {
    ipv8_url: `http://localhost:${brpServer.port}`,
    rest_port: ports.recipeBRPServer,
    mid_b64: brpServer.mid_b64,
}

import { loadTemporaryIPv8Configuration } from "../../util/ipv8conf"
import { ports } from "../ports"

const randServer = loadTemporaryIPv8Configuration("rand")

export const randServerPeer = {
    ipv8_url: `http://localhost:${randServer.port}`,
    rest_port: ports.recipeRandServer,
    mid_b64: randServer.mid_b64,
}

import { loadTemporaryIPv8Configuration } from "../../util/ipv8conf"
import { ports } from "../ports"

const kvkServer = loadTemporaryIPv8Configuration("kvk")

export const kvkServerPeer = {
    ipv8_url: `http://localhost:${kvkServer.port}`,
    rest_port: ports.recipeKVKServer,
    mid_b64: kvkServer.mid_b64,
}

import { loadTemporaryIPv8Configuration } from "../../util/ipv8conf"

const client = loadTemporaryIPv8Configuration("test-alice")

export const clientPeer = {
    ipv8_url: `http://localhost:${client.port}`,
    mid_b64: client.mid_b64,
}

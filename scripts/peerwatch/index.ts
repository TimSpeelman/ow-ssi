import yargs from "yargs";
import { IPv8API } from "../../src/ipv8/api/IPv8API";
import { promiseTimer } from "../../src/util/promiseTimer";

const argv = yargs
    .option('ports', {
        alias: 'p',
        description: 'The range of ports to monitor, formatted `start:end`',
        type: 'string',
        default: '13310:13320',
    })
    .help()
    .alias('help', 'h')
    .argv;

/**
 * Peerwatch checks for a number of IPv8 instances which peers they know
 */

/** Range as two ports separated by colon `80:83` -> [80,81,82,83]  */
function rangeToPorts(range: string) {
    const [start, end] = range.split(":")
    const s = parseInt(start, 10);
    const e = parseInt(end, 10);
    return new Array(e - s + 1).fill(1).map((_, i) => s + i);
}


const portsIn = typeof (argv.ports) === "string" ? [argv.ports] : argv.ports;
const ports = portsIn.map(p => p.includes(":") ? rangeToPorts(p) : [parseInt(p, 10)]).reduce((r, rng) => [...r, ...rng], []);
const chars = 5;

async function get(api: IPv8API) {
    return api.listPeers().catch(() => "Offline");
}
async function run(ports: number[]) {
    let apis = ports.map(p => new IPv8API(`http://localhost:${p}`));
    console.log("Monitoring ports", ports);

    while (true) {
        let mids = await Promise.all(apis.map(a => a.getMyId().catch(() => "")));
        const results = await Promise.all(apis.map(a => get(a)));

        console.clear();
        results.forEach((peers: string[] | "Offline", i) => {
            const port = ports[i];
            const mid = mids[i].substr(0, chars);
            const formatPeer = (p: string) => mids.indexOf(p) >= 0 ? mids.indexOf(p) : p.substr(0, chars);
            const _peers = peers === "Offline" ? "Offline" : peers.map(formatPeer).join(", ");

            console.log(`${i}) ${port}, ${mid}: ${_peers}`)
        })

        await promiseTimer(200);
    }
}

run(ports);



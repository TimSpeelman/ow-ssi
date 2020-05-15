import colors from "colors";
import yargs from "yargs";
import { IPv8API } from "../../src/ipv8/api/IPv8API";
import { Peer } from "../../src/ipv8/api/types";
import { Hook } from "../../src/util/Hook";
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
 * DHTWatch checks for a number of IPv8 instances whether they can find each other using /dht/peers
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

type Result = Peer[] | "error";

const againAfter = 5000;

async function keepFinding(api: IPv8API, targetMid: string, cb: (r: Result) => void) {
    let attempt = 1;
    const hook = new Hook<Result>();
    hook.on(cb);

    if (targetMid === "") {
        return;
    }

    let done = false;

    while (!done) {
        const result: any = await api.connectPeer(targetMid).catch((e) => e.message);
        if (typeof result !== "string") {
            await promiseTimer(againAfter);
        }
        // console.log("Result", targetMid, result);
        hook.fire(result);
    }
}

async function run(ports: number[]) {
    let apis = ports.map(p => new IPv8API(`http://localhost:${p}`));
    // let error = ports.map(p1 => ports.map(p2 => null));
    let mids = (await Promise.all(apis.map(a => a.getMyId().catch(() => ""))));
    return runOnline(ports.filter((x, i) => mids[i] !== ""), apis.filter((x, i) => mids[i] !== ""), mids.filter((x, i) => mids[i] !== ""));
}

async function runOnline(ports: number[], apis: IPv8API[], mids: string[]) {

    let results = ports.map(p1 => ports.map(p2 => null));

    // Keep track of each ip per mid
    let ips = {};
    mids.forEach(mid => { ips[mid] = [] });

    const onResult = (srcIndex: number, trgIndex: number, trgMid: string) => (result: Result) => {
        if (typeof result !== "string") {
            result.forEach(peer => {
                const addr = `${peer.address[0]}:${peer.address[1]}`;
                if (ips[trgMid].indexOf(addr) < 0) {
                    ips[trgMid].push(addr);
                }
            });

        }
        results[srcIndex][trgIndex] = result
    }




    const formatResult = (f: Result, i: number, j: number) => f === null ? " " :
        (typeof f === "string" ? colors.red("E") : colors.green(`${j}`))

    apis.map((api, i) => mids.map((mid, j) => i !== j && keepFinding(api, mid, onResult(i, j, mid))));

    while (true) {
        console.clear();
        console.log("DHT Discovery: ");
        results.map((x, i) => {

            console.log(`${i}) ${ports[i]}, ${mids[i]}: ${results[i].map((f, j) => i === j ? "." : formatResult(f, i, j)).join(" ")}`)
        })
        console.log("Addresses: ");
        mids.map((mid) => {
            console.log(`${mid.substr(0, chars)}: ${ips[mid].join(", ")}`)
        })
        await promiseTimer(1000);

    }
}

run(ports);



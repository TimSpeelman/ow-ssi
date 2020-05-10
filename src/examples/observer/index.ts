import { IPv8API, IPv8Observer } from "../../ipv8";
import { CommandLineInterface } from "../../util/CommandLineInterface";


const cli = new CommandLineInterface();
cli.outputHook.on(async (arg) => {
    const api = new IPv8API(arg);
    const o = new IPv8Observer(api, 50);
    o.start();
    o.onAttestationRequest((a) => console.log(arg, "New att. req.", a))
    o.onAttestation((a) => console.log(arg, "New attestation", a))
    o.onPeerFound((a) => console.log(arg, "New peer", a))
    o.onVerificationRequest((a) => console.log(arg, "New ver. req.", a))
    o.onVerification((a) => console.log(arg, "New verification", a))
    cli.read();
})

console.log("Welcome to the Recipe Client CLI");
console.log("Type an IPv8 REST API URL to observe it");

cli.read();

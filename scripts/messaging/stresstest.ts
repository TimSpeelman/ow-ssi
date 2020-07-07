import { MessageHandler } from "../../src/ow/events/OWMessageDispatch";
import { OWAgent } from "../../src/ow/OWAgent";


const alice = 10001;
const bob = 10002;

let i = 0;

const iv = 200; // ms
const a = new OWAgent(`http://localhost:${alice}`, iv)
const b = new OWAgent(`http://localhost:${bob}`, iv)

const aliceIn = [];
const bobIn = [];

const onMessageAlice: MessageHandler = (m) => { aliceIn.push(m.message); return true; }
a.dispatch.addHandler(onMessageAlice);

const onMessageBob: MessageHandler = (m) => { bobIn.push(m.message); return true; }
b.dispatch.addHandler(onMessageBob);

async function run() {
    await a.start();
    await b.start();

    const iv2 = 200;
    const interval = setInterval(() => {
        if (i < 1000) {
            a.api.sendMessage(b.mid, `${i++}`)
                .catch(console.error);
        } else {
            clearInterval(interval);
            console.log("Alice got " + aliceIn.length, " messages")
            console.log("Bob got " + bobIn.length, " messages")
        }
    }, iv2)

}

run().catch(console.error);
import readline = require("readline");
import { Hook } from "./Hook";

export class CommandLineInterface {
    public readonly outputHook = new Hook<string>();
    private stream: readline.Interface;

    constructor() {
        this.stream = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    public send(output: string): void {
        const _console = console;
        _console.log(output);
        this.read();
    }

    public read() {
        this.stream.question("$ ", (cmd: string) => {
            this.outputHook.fire(cmd);
            this.read();
        });
    }

}

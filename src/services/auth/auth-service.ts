/**
 * This is the main script for running a standalone Authentication Service
 */

import fs from "fs";
import yargs from "yargs";
import { OWVerifier } from "../../../modules/browser/ow";
import { VerifyHttpServer } from "../../auth/HttpServer";
import { IPv8Service } from "../../ipv8/IPv8Service";
import { AuthServiceConfigValidator } from "./validate";

const argv = yargs
    .option('port', {
        alias: 'p',
        description: 'The port on which the Auth Service exposes its API',
        type: 'number',
        default: 80,
    })
    .option('ipv8-port', {
        alias: 'i',
        description: 'The port on which the IPv8 instance runs',
        type: 'number',
        default: 8080,
    })
    .option('config', {
        alias: 'c',
        description: 'The path to the JSON configuration file',
        type: 'string',
        default: "data/config.json",
    })
    .help()
    .alias('help', 'h')
    .argv;

const ipv8_port = argv["ipv8-port"];
const pollInterval = 200;

// The container's host should mount this folder.
const pathToConfig = argv.config;
if (!fs.existsSync(pathToConfig)) {
    console.error(`No configuration file found at "${pathToConfig}"`);
    process.exit(1);
    // throw new Error(`No configuration file found at "${pathToConfig}"`);
}
const config = JSON.parse(fs.readFileSync(pathToConfig, { encoding: 'utf8' }));

// Validate configuration
const validationError = AuthServiceConfigValidator(config);
if (validationError) {
    console.error(`Validation error in configuration "${pathToConfig}":`, validationError);
    process.exit(1);
}

console.log("Configuration loaded:", config);

const { server_port, templates } = config;

// Start listening to IPv8
const ipv8URL = `http://localhost:${ipv8_port}`;
const ipv8service = new IPv8Service(ipv8URL, pollInterval);
ipv8service.start();

console.log("Listening to IPv8 at", ipv8URL);

// Set up the Verification Service
const verifier = new OWVerifier(ipv8service.verifierService);
const server = new VerifyHttpServer(
    templates,
    server_port,
    verifier,
    ipv8service
);
server.start();

console.log("Authentication Service listening on port", server_port);

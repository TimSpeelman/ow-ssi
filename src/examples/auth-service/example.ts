import express from "express";
import path from "path";
import { VerifyHttpServer } from "../../auth/HttpServer";
import { IPv8Service } from "../../ipv8/IPv8Service";
import { OWVerifier } from "../../ow/protocol/OWVerifier";
import { OWVerifyRequest } from "../../ow/protocol/types";
import { loadTemporaryIPv8Configuration } from "../../util/ipv8conf";
import { ports } from "../ports";

/**
 * Auth Service Example
 * --------------------
 * A web-application can integrate Open Wallet SSI by
 * (1) running an Authentication Server, for example using Docker, and;
 * (2) embedding a QR code on its user interface
 * 
 * We also offer a Dummy Wallet so we don't need to use our phone every
 * time we wish to test this.
 * 
 * This example runs three services for the Authenticating party:
 * - Port 7000: An HTTP server that serves the static /public folder (user interface with QR)
 * - Port 8000: The HTTP Authentication Server that performs the authentication
 * - Port ?: An IPv8 instance for the Authentication Server
 */


// Set up a tiny server that serves the Example Application.
const port = ports.authServiceStatic;
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.listen(port);

console.log(`Auth Service web application running at http://localhost:${port} .`);

// SERVER 
const ipv8Config = loadTemporaryIPv8Configuration("auth-service");
const ipv8URL = `http://localhost:${ipv8Config.port}`;

const config = {
    pollInterval: 200,
    serverPort: ports.authServiceServer,
}

const ipv8service = new IPv8Service(ipv8URL, config.pollInterval);
ipv8service.start();

const nameRequest: OWVerifyRequest = {
    ref: "abc",
    verifier_id: ipv8Config.mid_b64,
    attributes: [{ ref: "x", name: "name", format: "id_metadata", include_value: true },],
};
const ageRequest: OWVerifyRequest = {
    ref: "abc",
    verifier_id: ipv8Config.mid_b64,
    attributes: [{ ref: "x", name: "age", format: "id_metadata", include_value: true },],
};

const templates = {
    name: nameRequest,
    age: ageRequest,
}

const verifier = new OWVerifier(ipv8service.verifierService);

const server = new VerifyHttpServer(
    templates,
    config.serverPort,
    verifier
);

server.start();

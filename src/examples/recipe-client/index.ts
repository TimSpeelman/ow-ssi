import Axios from "axios";
import { IPv8Service } from "../../ipv8/IPv8Service";
import { OWAttributeRepository } from "../../ow/OWAttributeRepository";
import { OWAttestee } from "../../ow/protocol/OWAttestee";
import { OWVerifiee } from "../../ow/protocol/OWVerifiee";
import { OWVerifyRequestResolver } from "../../ow/resolution/OWVerifyRequestResolver";
import { RecipeClient } from "../../recipe/RecipeClient";
import { Recipe, RecipeServiceDescriptor } from "../../recipe/types";
import { Dict } from "../../types/Dict";
import { CommandLineInterface } from "../../util/CommandLineInterface";
import { loadTemporaryIPv8Configuration } from "../../util/ipv8conf";

const peer = loadTemporaryIPv8Configuration("recipe-client")

/** 
 * A simple Wallet that knows how to work with recipes.
 * 
 * It allows to load recipes from a RecipeService url (which serves a RecipeServiceDescriptor in JSON format)
 * and subsequently execute those recipes.
 */
class Wallet {

    public verifiee: OWVerifiee;
    public attestee: OWAttestee;
    public repo: OWAttributeRepository;
    public resolver: OWVerifyRequestResolver;
    public recipeClient: RecipeClient;

    public services: RecipeServiceDescriptor[] = [];
    public recipes: Dict<Recipe> = {};

    constructor(
        protected me: IPv8Service,
        protected myId: string,
    ) {

        this.verifiee = new OWVerifiee(me.verifieeService);
        this.attestee = new OWAttestee(me.attesteeService);
        this.repo = new OWAttributeRepository();
        this.resolver = new OWVerifyRequestResolver(myId, this.repo);
        this.recipeClient = new RecipeClient(myId, this.verifiee, this.attestee);
    }

    async loadRecipes(url: string) {
        const httpResponse = await Axios.get(url);
        const service: RecipeServiceDescriptor = httpResponse.data;
        if (service && service.recipes) {
            console.log("Found RecipeService", service)
            this.services.push(service);
            this.recipes = {
                ...this.recipes,
                ...service.recipes,
            }
        } else {
            console.log("No service found on URL:", url);
        }
    }

    async executeRecipe(recipe: Recipe) {

        const process = this.recipeClient.createProcess(recipe);

        let vResponse;
        if (recipe.verify_request) {

            // See if we attributes matching the VerifyRequest
            const result = await this.resolver.resolveRequest(recipe.verify_request);

            // If we cannot resolve it, quit.
            if (result.status !== "success") {
                console.log("Could not resolve this verification request: ", result.status);
                return;
            }

            // Otherwise allow the server to validate it (once we have requested the recipe).
            vResponse = result.response;
            console.log("vReq resolved to", vResponse);
            console.log("Allowing verification");

            process.allowVerification(vResponse).catch();
        } else {
            console.log("Nothing to verify");
        }

        // Create the recipe request, using the verification response if necessary
        const recipeRequest = process.createRequest(vResponse);
        console.log("Sending request..", recipeRequest);

        // Request the recipe via the service endpoint
        let httpResponse;
        try {
            httpResponse = await Axios.post(recipe.service_endpoint, { request: recipeRequest })
        } catch (e) {
            console.error("Request failed", e);
            return;
        }

        // The service offers us some data
        const offer = httpResponse.data.offer;
        console.log("Received offer", offer);

        // Make sure that the offer is valid (syntactically and matches the offer)
        const errors = process.validateOffer(offer);
        if (errors.length > 0) {
            console.error("Recipe execution failed, offer did not validate: ", offer);
            return;
        }

        // Request attestation based on this offer
        const attrs = await process.requestAttestation(offer);
        console.log("Received attributes:");
        attrs.map(a => {
            console.log(a)
        })

        // Save the attributes in our Wallet
        attrs.map(a => this.repo.put(a));

        return attrs;
    }
}

const me = new IPv8Service(`http://localhost:${peer.port}`);
me.start();

const myId = peer.mid_b64;

const wallet = new Wallet(me, myId);

// We set up a simple Command Line interface
// that allows us to operate the wallet

const cli = new CommandLineInterface();
cli.outputHook.on(async (arg) => {
    if (arg.startsWith("load ")) {
        const url = arg.substr(5);
        await wallet.loadRecipes(url);
        cli.read();
    }
    if (arg.startsWith("run ")) {
        const recipe_name = arg.substr(4);
        await wallet.executeRecipe(wallet.recipes[recipe_name]);
        cli.read();
    }
    if (arg.startsWith("repo")) {
        console.log("Your attributes:");
        (await wallet.repo.all()).map(a => {
            console.log(`${a.name}: ${a.value} (format ${a.format}) signed by ${a.signer_mid_b64}`)
        }
        )
        cli.read();
    }
})

console.log("Welcome to the Recipe Client CLI");
console.log("Say `load [url]` to load a Recipe Service at that url");
console.log("Say `run [recipe name]` to execute a known Recipe with that name");
console.log("Say `repo` to list all your attributes");

cli.read();

import { IPv8Service } from "../../ipv8/IPv8Service";
import { HttpRecipeServer } from "../../recipe/HttpRecipeServer";
import { RecipeServer } from "../../recipe/RecipeServer";
import { randServerPeer } from './config';
import { RandDescription } from "./description";
import { RandRecipes } from "./recipes";

const options = {
    ipv8_url: randServerPeer.ipv8_url,
    http_port: randServerPeer.rest_port,
    mid_b64: randServerPeer.mid_b64,
}

const ipv8 = new IPv8Service(options.ipv8_url);
ipv8.start();

const recipeServer = new RecipeServer(options.mid_b64, ipv8, RandRecipes);

const httpServer = new HttpRecipeServer(RandDescription, options.http_port, recipeServer);

httpServer.start()

console.log(`Recipe Service "Random Number" running at http://localhost:${options.http_port}`)

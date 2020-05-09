import { IPv8Service } from "../../ipv8/IPv8Service";
import { HttpRecipeServer } from "../../recipe/HttpRecipeServer";
import { RecipeServer } from "../../recipe/RecipeServer";
import { brpServerPeer } from './config';
import { BRPDescription } from "./description";
import { BRPRecipes } from "./recipes";

const options = {
    ipv8_url: brpServerPeer.ipv8_url,
    http_port: brpServerPeer.rest_port,
    mid_b64: brpServerPeer.mid_b64,
}

const ipv8 = new IPv8Service(options.ipv8_url);
ipv8.start();

const recipeServer = new RecipeServer(options.mid_b64, ipv8, BRPRecipes);

const httpServer = new HttpRecipeServer(BRPDescription, options.http_port, recipeServer);

httpServer.start()

console.log(`Recipe Service "BRP" running at http://localhost:${options.http_port}/about`)

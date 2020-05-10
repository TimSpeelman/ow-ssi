import { IPv8Service } from "../../ipv8/IPv8Service";
import { HttpRecipeServer } from "../../recipe/HttpRecipeServer";
import { RecipeServer } from "../../recipe/RecipeServer";
import { kvkServerPeer } from './config';
import { KVKDescription } from "./description";
import { KVKRecipes } from "./recipes";

const options = {
    ipv8_url: kvkServerPeer.ipv8_url,
    http_port: kvkServerPeer.rest_port,
    mid_b64: kvkServerPeer.mid_b64,
}

const ipv8 = new IPv8Service(options.ipv8_url);
ipv8.start();

const recipeServer = new RecipeServer(options.mid_b64, ipv8, KVKRecipes);

const httpServer = new HttpRecipeServer(KVKDescription, options.http_port, recipeServer);

httpServer.start()

console.log(`Recipe Service "KVK" running at http://localhost:${options.http_port}`)

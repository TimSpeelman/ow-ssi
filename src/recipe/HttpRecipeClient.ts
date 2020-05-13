import Axios from "axios";
import { OWAttestee } from "../ow/protocol/OWAttestee";
import { OWVerifiee } from "../ow/protocol/OWVerifiee";
import { OWAttestOffer } from "../ow/protocol/types";
import { RecipeClient } from "./RecipeClient";
import { Recipe, RecipeRequest } from "./types";


export abstract class HttpRecipeClient extends RecipeClient {

    constructor(
        protected myId: string,
        protected verifiee: OWVerifiee,
        protected attestee: OWAttestee,
    ) { super(myId, verifiee, attestee); }

    protected sendRequestToServer(recipe: Recipe, request: RecipeRequest): Promise<OWAttestOffer> {
        return Axios.post(recipe.service_endpoint, { request }).then(r => r.data.offer);
    }

}
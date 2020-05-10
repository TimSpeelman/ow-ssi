import bodyParser from "body-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { mapValues } from "../util/mapValues";
import { Validate } from "../util/validate";
import { RecipeServer } from "./RecipeServer";
import { RecipeRequestValidator } from "./syntax-validation";
import { RecipeRequest, RecipeServiceDescriptor } from "./types";

const { many, atKey } = Validate

export class HttpRecipeServer {

    constructor(
        private description: RecipeServiceDescriptor,
        private port: number,
        private recipeServer: RecipeServer,
        private logger: (...args: any[]) => void = console.log,
    ) { }

    public start() {
        const app = express();
        app.use(bodyParser.json({ type: "application/json" }));
        app.use(cors());

        app.get("/", this.handleGetAbout.bind(this));

        app.post("/recipe", this.handlePostRecipe.bind(this));

        app.use(this.handleError.bind(this));

        this.logger(`Listening at port ${this.port}.`);
        app.listen(this.port);
    }

    /** Serve the ServiceDescriptor */
    protected handleGetAbout(req: Request, res: Response) {
        res.setHeader("content-type", "application/json");

        // Provide the service endpoint URL based on
        // the current host.
        const endpoint = `http://${req.headers.host}/recipe`;
        const localizedDescription: RecipeServiceDescriptor = {
            ...this.description,
            recipes: mapValues(this.description.recipes, (recipe) => ({
                ...recipe,
                service_endpoint: endpoint,
            }))
        };

        res.send(localizedDescription);
    }

    /** Execute a Recipe */
    protected handlePostRecipe(req: Request, res: Response, next: NextFunction) {
        res.setHeader("content-type", "application/json");

        // Validate HTTP Request
        const data = req.body;
        const validator = many([
            atKey('request', RecipeRequestValidator)
        ]);
        const error = validator(data);
        if (error !== false) {
            return this.sendInvalidRequest(res, `Validation Error: ${error}`);
        }

        const recipeRequest: RecipeRequest = data.request;

        this.recipeServer.executeRecipe(recipeRequest)
            .then((offer) => res.send({ offer }))
            .catch((e) => this.sendInvalidRequest(res, e));

    }

    protected sendInvalidRequest(res: Response, error: string) {
        return res.status(400).send({ error });
    }

    protected handleError(err, req: Request, res: Response, next) {
        this.logger("HttpServer Error", err);

        if (res.headersSent) {
            return next(err)
        }
        res.setHeader("content-type", "application/json");
        res.status(500)
        res.send({
            error: {
                message: err.message,
                name: err.name,
            }
        })
    }
}

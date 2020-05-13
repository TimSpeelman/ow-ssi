/**
 * A browser-compatible NPM module must not include 
 * non-browser dependencies such as Express
 */
import * as IPv8 from "./browser/ipv8";
import * as OpenWallet from "./browser/ow";
import * as Recipe from "./browser/recipe";

export { IPv8, OpenWallet, Recipe };

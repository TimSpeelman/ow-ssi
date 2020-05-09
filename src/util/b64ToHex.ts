import atob from "atob";

export function b64ToHex(b64) {
    return atob(b64).split("").map(c => c.charCodeAt(0).toString(16)).join("")
}
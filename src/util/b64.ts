export function b64encode(str: string) {
    return Buffer.from(str).toString('base64')
}

# Open Wallet Auth Service
Expose a NodeJS server that is run in a Docker container, with some JSON/env configuration.

It does the following:
- The configuration contains named OWVerifyRequest templates
- The API exposes `/referToVerifyRequest?template=[x]` which returns a unique link to an OWVerifyRequest. If `&qr` is specified, it renders a QR code. (user scans this with phone) The uuid is persisted.
- The API exposes `/getVerifyRequest?template=[x]` which returns an OWVerifyRequest. HTTP transport. (user phone calls this)
- The API exposes `/verifyMe?template=[x]&uuid=[y]` which allows the peer to submit an OWVerifyResponse, upon which IPv8 verification begins (if the server accepts). 
- The API exposes `/result?uuid=[y]` which allows the web-client to poll for the verification result in JWT.

Upon successful verification, the attestation server returns a JWT with the result and details of the verification. The client can use this to access other services. 

## Open Wallet Enabled Portal
A front-end needs only add an image tag `<img src="/referToVerifyRequest?template=[x]&qr" />` to display a QR code.

## Open Wallet Client implementation
A client implementation needs a QR scanner to scan the tag. It decodes into an `IntentToVerify` object with a URL. The client calls the URL expecting it to resolve to an `OWVerifyRequest`. The client treats this as any other, resolving, asker user consent, and then submits the response to the `returnAddress`, after which it executes verification.



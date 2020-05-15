# Open Wallet Authentication Service - Docker Image
The Open Wallet Authentication Service can be run in a Docker container.

## Build the image
To build the image, first clone this repository on the host machine.

```git clone git@github.com/TimSpeelman/ow-ssi```

Enter the directory holding the AuthService Dockerfile.

```cd ow-ssi/images/auth-service```

Build the image.

```docker build -t owauth .```

## Running a container
To spin up an authentication service, you must first define its configuration: the templates it will use to verify the principal's identity. This is done using a JSON configuration file, such as shown below. 

```
{
    "templates": {
        "exampletemplate": {
            "attributes": [
                {
                    "ref": "name",
                    "name": "name",
                    "format": "id_metadata",
                    "include_value": true
                }
            ]
        },
        "anothertemplate": {
            "attributes": [
                {
                    "ref": "age",
                    "name": "age",
                    "format": "id_metadata",
                    "include_value": true
                }
            ]
        }
    }
}
```

Create such a JSON configuration file named `config.json` and put it in a new folder on the host machine (e.g. `/path/to/shared/folder`).

Suppose you wish to run the authentication service on port `1234`, then use the following command:

```docker run -d -p 1234:80 --mount type=bind,source=/path/to/shared/folder,destination=/share owauth```

The service should not be running on `http://localhost:1234/`. You should see the templates you configured, at ```http://localhost:1234/templates```.

## Using it in a web application
To use the OW Authentication Service you may simply include the following lines of HTML code in your web application:

```
<script src="http://localhost:1234/client.js"></script>
<script>OWVerifyService.verifyByQR("exampletemplate", onVerifyName, "qr-name")</script>

... 

<div id="qr-name"></div>
```

This loads a small script served by the authentication service. It does the following:

1. It starts a verification session with template name `exampletemplate`. The server returns a `RedirectURL` and a `ResultURL`.
2. It then places a QR code with content `IntentToVerify|[RedirectURL]` in your HTML element with id `qr-name`.
3. Finally, it polls the `ResultURL` to see whether verification has succeeded or failed. If it has a result, it calls the `onVerifyName` callback.
   
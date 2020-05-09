import json
import os
import shutil
from base64 import b64encode
from binascii import hexlify

from twisted.internet import reactor

from ipv8.configuration import get_default_configuration
from ipv8.REST.rest_manager import RESTManager
from ipv8_service import IPv8

data = {}

# Launch IPv8 services.
# We run REST endpoints for these services on:
#  - http://localhost:14411/
#  - http://localhost:14412/
#  - ...
# This script also prints the peer ids for reference with:
#  - http://localhost:1441*/attestation?type=peers

if os.path.exists("temp"):
    shutil.rmtree("temp")

os.mkdir("temp")

names = [
    'auth-service',
    'dummy-wallet',
    'freeform-attest', 
    'kvk',
    'brp',
    'rand',
    'test-alice',
    'test-bob',
    ]
indices = range(len(names))
for i in indices:
    name = names[i]
    os.mkdir("temp/" + name)
    configuration = get_default_configuration()
    configuration['logger']['level'] = "ERROR"
    configuration['keys'] = [
        {'alias': "anonymous id", 'generation': u"curve25519",
            'file': u"temp/" + name + "/multichain.pem"},
        {'alias': "my peer", 'generation': u"medium",
            'file': u"temp/" + name + "/ec.pem"}
    ]

    # Only load the basic communities
    # requested_overlays = ['DiscoveryCommunity', 'AttestationCommunity', 'IdentityCommunity']
    # configuration['overlays'] = [o for o in configuration['overlays'] if o['class'] in requested_overlays]

    # Give each peer a separate working directory
    working_directory_overlays = ['AttestationCommunity', 'IdentityCommunity']
    for overlay in configuration['overlays']:
        if overlay['class'] in working_directory_overlays:
            overlay['initialize'] = {'working_directory': 'temp/' + name}

    # Start the IPv8 service
    ipv8 = IPv8(configuration)
    rest_manager = RESTManager(ipv8)
    rest_manager.start(14410 + i)

    # Print the peer for reference
    print("Starting peer " + name, i)
    print("port", (14410 + i))
    print("url", "http://localhost:" + str(14410 + i))
    print("mid_b64", b64encode(ipv8.keys["anonymous id"].mid))

    data = {
        'port': 14410 + i,
        'mid_b64': b64encode(ipv8.keys["anonymous id"].mid),
    }

    with open('temp/' + name + '/config.json', 'w') as outfile:
        json.dump(data, outfile)

reactor.run()

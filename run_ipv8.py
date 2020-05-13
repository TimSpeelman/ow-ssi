import json
import os
import shutil
import signal
import sys

from asyncio import all_tasks, ensure_future, gather, get_event_loop, sleep
from base64 import b64encode
from pyipv8.ipv8_service import IPv8
from pyipv8.ipv8.configuration import get_default_configuration
from pyipv8.ipv8.REST.rest_manager import RESTManager

tempdir = "temp"
names = [
    'auth-service',
    'dummy-wallet',
    'freeform-attest', 
    'kvk',
    'brp',
    'rand',
    'recipe-client',
    'test-alice',
    'test-bob',
]

# Launch IPv8 services.
# We run REST endpoints for these services on:
#  - http://localhost:14410/
#  - http://localhost:14411/
#  - ...
# This script also prints the peer ids for reference with:
#  - http://localhost:1441*/attestation?type=peers

class MyService(object):

    first_port = 14410

    def __init__(self):
        """
        Keep track of the IPv8 instances and RESTAPIs
        """
        self.peers = [] # (index, name, ipv8, api)
        self._stopping = False

    async def start(self):
        
        # Recreate the temp directory, so we always start fresh
        self.clear_tempdir()

        # Start each peer
        for i in range(len(names)):
            peer = await self.start_peer(names[i], i)

            # Keep the instance and API for termination
            self.peers.append(peer)

        # Handle shut down
        async def signal_handler(sig):
            print("Received shut down signal %s" % sig)
            if not self._stopping:
                self._stopping = True

                for (i, name, ipv8, api) in self.peers:
                    print("Stopping peer %d (%s)" % (i, name))
                    if api:
                        await api.stop()
                    await ipv8.stop()
                
                await gather(*all_tasks())
                get_event_loop().stop()

        signal.signal(signal.SIGINT, lambda sig, _: ensure_future(signal_handler(sig)))
        signal.signal(signal.SIGTERM, lambda sig, _: ensure_future(signal_handler(sig)))            

    def clear_tempdir(self):
        if os.path.exists(tempdir):
            shutil.rmtree(tempdir)

        os.mkdir(tempdir)


    async def start_peer(self, name, i):

        # Give the peer its own working directory
        workdir = u"%s/%s" % (tempdir, name)
        os.mkdir(workdir)

        # Set up its IPv8 Configuration
        configuration = get_default_configuration()
        configuration['logger']['level'] = "ERROR"
        configuration['keys'] = [
            {
                'alias': "anonymous id", 
                'generation': u"curve25519",
                'file': u"%s/multichain.pem" % (workdir)
            },
            {
                'alias': "my peer",
                'generation': u"medium",
                'file': u"%s/ec.pem" % (workdir)
            }
        ]

        # Provide the working directory to its overlays
        working_directory_overlays = ['AttestationCommunity', 'IdentityCommunity']
        for overlay in configuration['overlays']:
            if overlay['class'] in working_directory_overlays:
                overlay['initialize'] = {'working_directory': workdir}

        # Start its IPv8 service
        ipv8 = IPv8(configuration)
        await ipv8.start()

        # Print the peer for reference
        port = self.first_port + i
        url = "http://localhost:%d" % port
        mid_b64 = b64encode(ipv8.keys["anonymous id"].mid).decode('utf-8')

        print("Starting peer %d (%s) running at %s" % (i, name, url))
        print("- workdir: %s" % workdir)
        print("- mid_b64: %s" % mid_b64)

        data = {
            'port': port,
            'mid_b64': mid_b64,
        }

        with open('%s/config.json' % workdir, 'w') as outfile:
            json.dump(data, outfile)

        # Start its API
        api = RESTManager(ipv8)
        await api.start(port)

        return (i, name, ipv8, api)


def main():
    service = MyService()

    loop = get_event_loop()
    coro = service.start()
    ensure_future(coro)


    if sys.platform == 'win32':
        # Unfortunately, this is needed on Windows for Ctrl+C to work consistently.
        # Should no longer be needed in Python 3.8.
        async def wakeup():
            while True:
                await sleep(1)
        ensure_future(wakeup())

    loop.run_forever()


if __name__ == "__main__":
    main()

FROM ubuntu:xenial

WORKDIR /user/home 

RUN apt-get update
RUN apt-get -y upgrade
RUN apt install -y software-properties-common
RUN add-apt-repository -y ppa:deadsnakes/ppa

RUN apt-get update
RUN apt-get -y upgrade
RUN apt install -y git nano curl

# Install Python 3.7
RUN apt install -y python3.7
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.7 1

# Install and upgrade pip
RUN apt install -y python3-pip
RUN python3 -m pip install --upgrade pip
RUN apt-get install -y python3.7-dev

# Install NodeJS
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
RUN apt-get install -y nodejs
RUN node --version
RUN npm --version

# Install Libsodium
RUN apt-get install -y libsodium-dev

# Clone IPv8 Fork 
WORKDIR /user/home
RUN git clone --branch open-wallet https://github.com/TimSpeelman/py-ipv8.git pyipv8

# Install IPv8
WORKDIR pyipv8
RUN python3 -m pip install -r requirements.txt

# Make softlink to IPv8
RUN ln -sd /user/home/pyipv8 /usr/local/lib/python3.7/dist-packages/pyipv8

# Clone OW-SSI
WORKDIR /user/home
RUN git clone https://github.com/TimSpeelman/ow-ssi ow-ssi

# Install OW-SSI
WORKDIR /user/home/ow-ssi
RUN npm install

# Make a shared directory to mount
RUN mkdir /share

# Fill shared directory with config
COPY ./config.json /share/config.json

# Put the bash script in home
COPY ./start.sh /user/home

# Make script executable
WORKDIR /user/home
RUN ["chmod", "+x", "start.sh"]

# Expose AuthService Port
EXPOSE 80

# Expose IPv8 HTTP for debugging
EXPOSE 8080

# Expose IPv8s UDP port
EXPOSE 8090/udp

CMD ["./start.sh"]

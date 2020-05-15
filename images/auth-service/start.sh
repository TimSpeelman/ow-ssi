#!/usr/bin/env bash
trap 'exit 0' SIGTERM

echo "Authentication Service Starting.."

cd /user/home/ow-ssi

python3 ./run_auth_service.py &
npm run service:auth -- --config /share/config.json &

wait


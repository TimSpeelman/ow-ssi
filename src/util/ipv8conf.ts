import fs from "fs";

export function loadTemporaryIPv8Configuration(name: string): Configuration {
    const data = fs.readFileSync(`temp/${name}/config.json`, { encoding: 'utf8' });
    return JSON.parse(data)
}

// Generated in run_ipv8.py
export interface Configuration {
    port: number,
    mid_b64: string,
}

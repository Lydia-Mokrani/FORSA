import axios from 'axios';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createPublicKey, generateKeyPairSync } from 'crypto';
import { dirname } from 'path';
import { config } from '../config/env';

interface PublicKeyResponse {
    algorithm: string;
    issuer: string;
    publicKey: string;
}

let cachedPublicKey: string | null = null;

function loadLocalPublicKey(): string {
    // Development-only local key fallback; never generate keys in production.
    if (config.nodeEnv !== 'development') {
        throw new Error('Local JWT key fallback is development-only.');
    }

    const publicKeyPath = config.jwtPublicKeyPath;
    const privateKeyPath = config.jwtPrivateKeyPath;

    if (!existsSync(publicKeyPath) || !existsSync(privateKeyPath)) {
        const { publicKey, privateKey } = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });

        mkdirSync(dirname(publicKeyPath), { recursive: true });
        mkdirSync(dirname(privateKeyPath), { recursive: true });
        writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
        writeFileSync(publicKeyPath, publicKey);
    }

    const localKey = readFileSync(publicKeyPath, 'utf8').trim();
    const key = createPublicKey(localKey);
    if (key.asymmetricKeyType !== 'rsa') {
        throw new Error('Local JWT public key must be RSA.');
    }
    return key.export({ type: 'spki', format: 'pem' }).toString();
}

export const AuthService = {
    async getPublicKey(): Promise<string> {
        if (cachedPublicKey) {
            return cachedPublicKey;
        }

        let publicKeyResponse: PublicKeyResponse;
        try {
            const response = await axios.get<PublicKeyResponse>(
                `${config.ms1Url}/api/auth/public-key`,
                { timeout: 5000 },
            );
            publicKeyResponse = response.data;
        } catch (err) {
            // Development-only local RSA public-key fallback when MS1 is unavailable.
            // JWT signature verification remains enabled; production never uses this fallback.
            if (config.nodeEnv !== 'development') {
                throw err;
            }
            return loadLocalPublicKey();
        }

        const { algorithm, issuer, publicKey } = publicKeyResponse;

        if (
            algorithm !== 'RS256' ||
            issuer !== 'forsa-ms1-accounts' ||
            typeof publicKey !== 'string' ||
            !publicKey.includes('-----BEGIN PUBLIC KEY-----')
        ) {
            throw new Error('MS1 returned an invalid RSA public key.');
        }

        cachedPublicKey = publicKey;
        return cachedPublicKey;
    },
};
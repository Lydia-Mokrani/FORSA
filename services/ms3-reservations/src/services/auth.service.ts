import axios from 'axios';
import { config } from '../config/env';

interface PublicKeyResponse {
    algorithm: string;
    issuer: string;
    publicKey: string;
}

let cachedPublicKey: string | null = null;

export const AuthService = {
    async getPublicKey(): Promise<string> {
        if (cachedPublicKey) {
            return cachedPublicKey;
        }

        const response = await axios.get<PublicKeyResponse>(
            `${config.ms1Url}/api/auth/public-key`,
            { timeout: 5000 },
        );

        const { algorithm, issuer, publicKey } = response.data;

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
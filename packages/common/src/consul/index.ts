import axios from 'axios';

export interface ConsulServiceConfig {
  consulUrl: string;       // ex: "http://localhost:8500"
  serviceName: string;     // ex: "ms1-accounts"
  serviceId: string;       // ex: "ms1-accounts-1"
  serviceHost: string;     // IP du serveur où tourne le microservice
  servicePort: number;     // Port HTTP du service
  healthPath?: string;     // ex: "/health"
  traefikPathPrefixes: string[]; // ex: ["/api/auth", "/api/users", "/api/shops"]
}

export class ConsulRegistry {
  private serviceInstanceId: string;

  constructor(private config: ConsulServiceConfig) {
    const sanitizedHost = (this.config.serviceHost || 'localhost').replace(/[^a-zA-Z0-9_-]/g, '-');
    this.serviceInstanceId = this.config.serviceId && this.config.serviceId.includes(sanitizedHost)
      ? this.config.serviceId
      : `${this.config.serviceName}-${sanitizedHost}-${this.config.servicePort}`;
  }

  /**
   * Enregistre le service dans Consul avec les tags Traefik pour le routage dynamique
   */
  async register(): Promise<void> {
    const healthUrl = `http://${this.config.serviceHost}:${this.config.servicePort}${this.config.healthPath || '/health'}`;
    
    // Construction des règles Traefik v3 lues dynamiquement depuis Consul (backticks obligatoires dans Traefik v3)
    const formattedPrefixes = this.config.traefikPathPrefixes.map(p => `\`${p}\``).join(', ');
    const pathRule = `PathPrefix(${formattedPrefixes})`;
    
    const registrationPayload = {
      ID: this.serviceInstanceId,
      Name: this.config.serviceName,
      Address: this.config.serviceHost,
      Port: this.config.servicePort,
      Tags: [
        'traefik.enable=true',
        `traefik.http.routers.${this.config.serviceName}.rule=${pathRule}`,
        `traefik.http.routers.${this.config.serviceName}.entrypoints=web`,
      ],
      Check: {
        HTTP: healthUrl,
        Interval: '10s',
        Timeout: '3s',
        DeregisterCriticalServiceAfter: '1m',
      },
    };

    try {
      await axios.put(
        `${this.config.consulUrl}/v1/agent/service/register`,
        registrationPayload
      );
      console.log(`✅ [Consul] Service "${this.config.serviceName}" (${this.serviceInstanceId}) enregistré avec succès (${healthUrl})`);

      // Gestion de la déconnexion propre (Graceful Shutdown)
      const cleanup = async () => {
        await this.deregister();
        process.exit(0);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
    } catch (err: any) {
      console.error(`❌ [Consul] Échec de l'enregistrement de "${this.config.serviceName}" :`, err?.message || err);
    }
  }

  async deregister(): Promise<void> {
    try {
      await axios.put(
        `${this.config.consulUrl}/v1/agent/service/deregister/${this.serviceInstanceId}`
      );
      console.log(`🔌 [Consul] Service "${this.serviceInstanceId}" désenregistré proprement.`);
    } catch (err: any) {
      console.error(`⚠️ [Consul] Erreur lors du désenregistrement :`, err?.message || err);
    }
  }
}

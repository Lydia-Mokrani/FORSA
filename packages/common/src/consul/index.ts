import axios from 'axios';

export interface ConsulServiceConfig {
  consulUrl: string;       // ex: "http://localhost:8500"
  serviceName: string;     // ex: "ms1-accounts"
  serviceId: string;       // ex: "ms1-accounts-1"
  serviceHost: string;     // IP du serveur où tourne le microservice
  servicePort: number;     // Port HTTP du service
  healthPath?: string;     // ex: "/health"
  traefikPathPrefixes: string[]; // ex: ["/api/auth", "/api/users", "/api/shops"]
  customTags?: string[];   // Tags Traefik / Consul additionnels (ex: middlewares, rateLimit)
  retryInitialMs?: number; // Délai initial de réessai (défaut: 1000ms)
  retryMaxMs?: number;     // Délai maximal de réessai (défaut: 30000ms)
}

export class ConsulRegistry {
  private serviceInstanceId: string;
  private isRegistered: boolean = false;
  private isShuttingDown: boolean = false;
  private retryTimer: NodeJS.Timeout | null = null;
  private retryAttempts: number = 0;

  constructor(private config: ConsulServiceConfig) {
    const sanitizedHost = (this.config.serviceHost || 'localhost').replace(/[^a-zA-Z0-9_-]/g, '-');
    this.serviceInstanceId = this.config.serviceId && this.config.serviceId.includes(sanitizedHost)
      ? this.config.serviceId
      : `${this.config.serviceName}-${sanitizedHost}-${this.config.servicePort}`;
  }

  public get registered(): boolean {
    return this.isRegistered;
  }

  public get instanceId(): string {
    return this.serviceInstanceId;
  }

  /**
   * Calcule le délai de réessai exponentiel avec gigue pour l'enregistrement Consul.
   */
  public calculateBackoffDelay(attempt: number): number {
    const initialMs = this.config.retryInitialMs ?? parseInt(process.env.CONSUL_RETRY_INITIAL_MS || '1000', 10);
    const maxMs = this.config.retryMaxMs ?? parseInt(process.env.CONSUL_RETRY_MAX_MS || '30000', 10);
    const exponential = Math.min(maxMs, initialMs * Math.pow(2, attempt));
    const jitter = Math.floor(Math.random() * 500);
    return exponential + jitter;
  }

  /**
   * Enregistre le service dans Consul avec les tags Traefik pour le routage dynamique.
   * En cas d'indisponibilité de Consul au démarrage, réessaie en boucle avec backoff
   * exponentiel sans jamais crasher le microservice.
   */
  async register(): Promise<void> {
    const healthUrl = `http://${this.config.serviceHost}:${this.config.servicePort}${this.config.healthPath || '/health'}`;
    
    // Construction des règles Traefik v3 lues dynamiquement depuis Consul (backticks obligatoires dans Traefik v3)
    const formattedPrefixes = this.config.traefikPathPrefixes.map(p => `\`${p}\``).join(', ');
    const pathRule = `PathPrefix(${formattedPrefixes})`;
    
    const tags = [
      'traefik.enable=true',
      `traefik.http.routers.${this.config.serviceName}.rule=${pathRule}`,
      `traefik.http.routers.${this.config.serviceName}.entrypoints=web`,
      ...(this.config.customTags || []),
    ];

    const registrationPayload = {
      ID: this.serviceInstanceId,
      Name: this.config.serviceName,
      Address: this.config.serviceHost,
      Port: this.config.servicePort,
      Tags: tags,
      Check: {
        HTTP: healthUrl,
        Interval: '10s',
        Timeout: '3s',
        DeregisterCriticalServiceAfter: '1m',
      },
    };

    const attemptRegistration = async (): Promise<void> => {
      if (this.isShuttingDown) return;

      try {
        await axios.put(
          `${this.config.consulUrl}/v1/agent/service/register`,
          registrationPayload
        );
        this.isRegistered = true;
        this.retryAttempts = 0;
        console.log(`✅ [Consul] Service "${this.config.serviceName}" (${this.serviceInstanceId}) enregistré avec succès (${healthUrl})`);
      } catch (err: any) {
        this.isRegistered = false;
        const delay = this.calculateBackoffDelay(this.retryAttempts);
        this.retryAttempts++;
        console.warn(
          `⚠️ [Consul] Échec de l'enregistrement de "${this.config.serviceName}" : ${err?.message || err}. Nouvelle tentative dans ${delay}ms...`
        );

        if (!this.isShuttingDown) {
          this.retryTimer = setTimeout(attemptRegistration, delay);
        }
      }
    };

    // Gestion de la déconnexion propre (Graceful Shutdown)
    const cleanup = async () => {
      this.isShuttingDown = true;
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
      }
      await this.deregister();
      process.exit(0);
    };

    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);

    await attemptRegistration();
  }

  async deregister(): Promise<void> {
    this.isShuttingDown = true;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.isRegistered = false;
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

export interface EnvironmentConfig {
  apiUrl: string;
}

const resolveApiUrl = (): string => {
  const metaEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  if (metaEnv?.['NG_APP_API_URL']) {
    return metaEnv['NG_APP_API_URL'];
  }

  const globalEnv = (globalThis as typeof globalThis & { __CONSULTORIO_API_URL__?: string }).__CONSULTORIO_API_URL__;
  if (globalEnv) {
    return globalEnv;
  }

  return 'http://localhost:5005';
};

export const environment: EnvironmentConfig = {
  apiUrl: resolveApiUrl()
};

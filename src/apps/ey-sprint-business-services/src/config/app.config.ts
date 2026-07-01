import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: process.env.JWT_SECRET ?? 'change-this-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  authStrictMode:
    process.env.AUTH_STRICT_MODE === 'false'
      ? false
      : process.env.NODE_ENV !== 'test',
  etihadDomain: process.env.ETIHAD_DOMAIN ?? 'etihad.ae',
  adminBootstrapEmail:
    process.env.ADMIN_BOOTSTRAP_EMAIL ?? 'mithunpramilak@etihad.ae',
  adminBootstrapPassword:
    process.env.ADMIN_BOOTSTRAP_PASSWORD ?? 'Admin@1234',
}));


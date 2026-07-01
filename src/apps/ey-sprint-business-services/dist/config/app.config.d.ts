declare const _default: (() => {
    port: number;
    nodeEnv: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    authStrictMode: boolean;
    etihadDomain: string;
    adminBootstrapEmail: string;
    adminBootstrapPassword: string;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    port: number;
    nodeEnv: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    authStrictMode: boolean;
    etihadDomain: string;
    adminBootstrapEmail: string;
    adminBootstrapPassword: string;
}>;
export default _default;

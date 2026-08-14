export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_DATABASE ?? 'texzy',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    googleRegistrationSecret: process.env.JWT_GOOGLE_REGISTRATION_SECRET,
    googleRegistrationExpiresIn:
      process.env.JWT_GOOGLE_REGISTRATION_EXPIRES_IN ?? '10m',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    androidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID ?? '',
    iosClientId: process.env.GOOGLE_IOS_CLIENT_ID ?? '',
  },
});

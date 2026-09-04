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
  storage: {
    r2: {
      accountId: process.env.R2_ACCOUNT_ID ?? '',
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      bucketName: process.env.R2_BUCKET_NAME ?? '',
      publicBaseUrl: process.env.R2_PUBLIC_BASE_URL ?? '',
      presignExpiresSeconds: parseInt(
        process.env.R2_PRESIGNED_URL_EXPIRES_SECONDS ?? '300',
        10,
      ),
    },
    upload: {
      maxFileSizeBytes: parseInt(
        process.env.UPLOAD_MAX_FILE_SIZE_BYTES ?? '8388608',
        10,
      ),
      allowedMimeTypes: (
        process.env.UPLOAD_ALLOWED_MIME_TYPES ??
        'image/jpeg,image/png,image/webp'
      )
        .split(',')
        .map((type) => type.trim())
        .filter(Boolean),
    },
    thumbnail: {
      // 800px @ quality 85 keeps thumbnails crisp on retina/2x grids without a huge file size.
      maxWidth: parseInt(process.env.THUMBNAIL_MAX_WIDTH ?? '800', 10),
      quality: parseInt(process.env.THUMBNAIL_QUALITY ?? '85', 10),
    },
  },
  firebase: {
    // Firebase Admin SDK (server-side push sender) — never sent to the frontend.
    // From Firebase Console -> Project settings -> Service accounts -> Generate new private key.
    projectId: process.env.FIREBASE_PROJECT_ID ?? '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY ?? '',
  },
  payments: {
    razorpay: {
      // Test-mode keys from the Razorpay Dashboard (Settings -> API Keys). Never commit real values.
      keyId: process.env.RAZORPAY_KEY_ID ?? '',
      keySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
      // Settings -> Webhooks -> (create webhook) -> Secret. Only needed once a public URL is configured.
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
    },
  },
});

import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

/**
 * SMTP is only wired up when credentials are present. Without this guard the
 * backend refuses to boot on any machine that has not set SMTP_PASSWORD, which
 * would make a fresh clone unrunnable. Falling back to the local provider keeps
 * order emails visible in the dev log instead.
 *
 * Vendor-agnostic on purpose — Brevo, Gmail, Resend and a domain mailbox all
 * work by changing these variables alone.
 */
const smtpConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD
)

const notificationProviders = smtpConfigured
  ? [
      {
        resolve: "./src/modules/notification-smtp",
        id: "notification-smtp",
        options: {
          channels: ["email"],
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          // The sending domain need not accept mail — point replies somewhere real.
          replyTo: process.env.SMTP_REPLY_TO,
        },
      },
    ]
  : [
      {
        resolve: "@medusajs/medusa/notification-local",
        id: "notification-local",
        options: {
          channels: ["email"],
        },
      },
    ]

const DEV_SECRET = "supersecret";

/**
 * Reads a signing secret, and refuses to start production without a real one.
 *
 * `jwtSecret` signs every session token and `cookieSecret` signs every cookie.
 * A default that silently works is exactly how a placeholder reaches a live
 * store — and this one is committed in the repo's history, so anyone who has
 * seen it could mint an admin session. Dev keeps the convenient default;
 * production refuses to boot without its own.
 */
const requireSecret = (name: "JWT_SECRET" | "COOKIE_SECRET") => {
  const value = process.env[name];

  if (!value || value === DEV_SECRET) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `${name} is unset or still the development default. Generate one with ` +
          `\`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"\` ` +
          `and set it in the environment before starting.`
      );
    }
    return DEV_SECRET;
  }

  return value;
};

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // Session storage
    redisUrl: process.env.REDIS_URL,
    databaseDriverOptions: {
      // `medusa db:migrate` migrates every module, and each wants connections at
      // once. Knex defaults to a pool of 10; on a CPU-limited container they are
      // not returned fast enough and the migration dies after 60 seconds with
      // "Timeout acquiring a connection. The pool is probably full." Postgres is
      // nowhere near its own limit when this happens — the ceiling is knex's.
      //
      // Tunable so a small VPS can be adjusted without rebuilding the image.
      pool: {
        min: 2,
        max: Number(process.env.DB_POOL_MAX ?? 30),
      },
    },
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: requireSecret("JWT_SECRET"),
      cookieSecret: requireSecret("COOKIE_SECRET"),
    }
  },
  modules: [
    // Cache — Redis instead of the in-memory default
    {
      resolve: "@medusajs/medusa/caching",
      options: {
        providers: [
          {
            resolve: "@medusajs/caching-redis",
            id: "caching-redis",
            is_default: true,
            options: {
              redisUrl: process.env.REDIS_URL,
            },
          },
        ],
      },
    },
    // Event bus — Redis instead of the in-memory default
    {
      resolve: "@medusajs/medusa/event-bus-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    // Workflow engine — Redis instead of the in-memory default
    {
      resolve: "@medusajs/medusa/workflow-engine-redis",
      options: {
        redis: {
          redisUrl: process.env.REDIS_URL,
        },
      },
    },
    // Notifications — SMTP relay when configured, console logging otherwise
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: notificationProviders,
      },
    },
    // Product images — local disk, served by the backend
    //
    // Configured explicitly rather than left to the default, because the
    // default `backend_url` is the literal string "http://localhost:9000/static"
    // and that URL is written into the `image` table at upload time. Uploading a
    // product photo on the server would therefore store a localhost URL that no
    // visitor can load — and changing the config afterwards would not repair the
    // rows already written.
    //
    // Files land in `static/` next to the process. In production that path is a
    // named Docker volume, so images survive a rebuild; back it up alongside
    // Postgres or a restore returns the catalogue with no pictures.
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-local",
            id: "local",
            options: {
              upload_dir: "static",
              backend_url: `${
                process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
              }/static`,
            },
          },
        ],
      },
    },
    // Product reviews — the one custom domain module; Medusa v2 ships none
    {
      resolve: "./src/modules/review",
    },
  ],
})

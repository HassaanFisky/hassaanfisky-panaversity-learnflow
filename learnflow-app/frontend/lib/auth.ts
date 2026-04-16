import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Pool } from "pg";

/**
 * Panaversity Ecosystem Auth — Unified H2 Backend (LearnFlow Node)
 */
export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },

  plugins: [
    jwt({
      jwt: {
        expirationTime: "7d",
        issuer: "panaversity-ecosystem",
      },
    }),
  ],

  secret: process.env.BETTER_AUTH_SECRET!,

  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "https://hackathon-2-todo-iota.vercel.app",
    "https://panaversity-h0-portfolio.vercel.app",
    "https://panaversity-h1-robotics.vercel.app",
    "https://hassaanfisky-panaversity-learnflow.vercel.app",
    "https://panaversity-h4-companion.vercel.app",
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User    = typeof auth.$Infer.Session.user;

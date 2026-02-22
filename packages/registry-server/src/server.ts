import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { initDb } from "./db/client.js";
import publishRoutes from "./routes/publish.js";
import ratingsRoutes from "./routes/ratings.js";
import skillsRoutes from "./routes/skills.js";

export async function createRegistryServer() {
  const fastify = Fastify({ logger: true });

  const allowedOrigin =
    process.env.REGISTRY_CORS_ORIGIN ?? (process.env.NODE_ENV === "production" ? false : "http://localhost:5173");
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });
  await fastify.register(cors, { origin: allowedOrigin, credentials: false });
  await fastify.register(rateLimit, { max: 60, timeWindow: "1 minute" });
  await fastify.register(multipart, {
    limits: { fileSize: 10_000_000, files: 1 },
  });

  initDb();

  await fastify.register(skillsRoutes);
  await fastify.register(publishRoutes);
  await fastify.register(ratingsRoutes);

  fastify.get("/health", async () => ({ status: "ok" }));

  return fastify;
}

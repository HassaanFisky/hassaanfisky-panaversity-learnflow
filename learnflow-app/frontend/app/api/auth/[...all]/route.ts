import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

/**
 * Panaversity Ecosystem Auth — Shared Router (LearnFlow Node)
 */
export const { GET, POST } = toNextJsHandler(auth);

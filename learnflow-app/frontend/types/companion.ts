/**
 * Companion System — Type Definitions (H0)
 */

export interface CompanionMessage {
  role:      "user" | "assistant";
  content:   string;
  timestamp: string; // ISO 8601
}

export interface CompanionSession {
  id:        string;
  title:     string;
  createdAt: string;
  updatedAt: string;
  messages:  CompanionMessage[];
  platform:  "H0" | "H1" | "H2" | "H3" | "H4";
}

export type CompanionPlatform = CompanionSession["platform"];

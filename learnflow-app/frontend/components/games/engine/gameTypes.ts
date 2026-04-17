export type GameId =
  | "reaction"
  | "memory"
  | "codematch"
  | "speedmath"
  | "tower"
  | "logicbuilder"
  | "agentcommander"
  | "debugescape"
  | "systemarchitect"
  | "decisionlab"
  | "flowfixer"
  | "signalrunner"
  | "resourcemanager"
  | "patternhunter"
  | "automationmaster"
  | "realworldsim"
  | "codestrategist";

export type GameCategory =
  | "QUICK_SKILLS"
  | "SYSTEMS"
  | "DECISIONS"
  | "DEBUG"
  | "PATTERNS";

export type DifficultyTier = "ENTRY" | "SKILLED" | "MASTER";

export type MasteryLevel = "Novice" | "Apprentice" | "Skilled" | "Expert" | "Master";

export interface GameResult {
  gameId: GameId;
  score: number;
  isNewBest: boolean;
  xpGained: number;
}

export interface GameState {
  highScores: Record<GameId, number>;
  mastery: Record<GameId, number>;
  onboarded: GameId[];
  totalXP: number;
  playCount: Record<GameId, number>;
}

export interface OnboardingStep {
  title: string;
  body: string;
  icon: React.ElementType;
}

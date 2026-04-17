import type { GameId, GameState, DifficultyTier, MasteryLevel } from "./gameTypes";

const ALL_GAME_IDS: GameId[] = [
  "reaction", "memory", "codematch", "speedmath", "tower",
  "logicbuilder", "agentcommander", "debugescape", "systemarchitect",
  "decisionlab", "flowfixer", "signalrunner", "resourcemanager",
  "patternhunter", "automationmaster", "realworldsim", "codestrategist",
];

// Internal only — not exposed in UI
const _SKILL_MAP: Record<GameId, string[]> = {
  reaction:        ["reaction time", "instinctive response"],
  memory:          ["working memory", "sequence recall"],
  codematch:       ["technical recall", "knowledge retrieval"],
  speedmath:       ["mental arithmetic", "number fluency"],
  tower:           ["knowledge depth", "sustained accuracy"],
  logicbuilder:    ["workflow decomposition", "sequential reasoning"],
  agentcommander:  ["delegation reasoning", "task prioritization"],
  debugescape:     ["debugging instincts", "error pattern recognition"],
  systemarchitect: ["system design", "dependency reasoning"],
  decisionlab:     ["decision confidence", "consequence thinking"],
  flowfixer:       ["pipeline thinking", "operational reasoning"],
  signalrunner:    ["event-driven thinking", "async sequencing"],
  resourcemanager: ["capacity planning", "constraint balancing"],
  patternhunter:   ["analytical thinking", "pattern recognition"],
  automationmaster:["functional composition", "automation design"],
  realworldsim:    ["operational reasoning", "incident response"],
  codestrategist:  ["algorithmic thinking", "tradeoff reasoning"],
};
void _SKILL_MAP; // used only internally

function makeDefaultState(): GameState {
  const emptyScores = ALL_GAME_IDS.reduce((acc, id) => ({ ...acc, [id]: 0 }), {} as Record<GameId, number>);
  const emptyMastery = ALL_GAME_IDS.reduce((acc, id) => ({ ...acc, [id]: 0 }), {} as Record<GameId, number>);
  const emptyCount = ALL_GAME_IDS.reduce((acc, id) => ({ ...acc, [id]: 0 }), {} as Record<GameId, number>);
  return {
    highScores: emptyScores,
    mastery: emptyMastery,
    onboarded: [],
    totalXP: 0,
    playCount: emptyCount,
  };
}

function loadState(): GameState {
  if (typeof window === "undefined") return makeDefaultState();
  try {
    const state = makeDefaultState();

    // Backward-compatible: read existing score/xp keys
    const rawScores = localStorage.getItem("lf_game_scores_v2");
    if (rawScores) {
      const parsed = JSON.parse(rawScores) as Partial<Record<GameId, number>>;
      for (const id of ALL_GAME_IDS) {
        if (parsed[id] !== undefined) state.highScores[id] = parsed[id]!;
      }
    }

    const rawXP = localStorage.getItem("lf_game_xp_v2");
    if (rawXP) state.totalXP = Number(rawXP) || 0;

    const rawMastery = localStorage.getItem("lf_game_mastery_v1");
    if (rawMastery) {
      const parsed = JSON.parse(rawMastery) as Partial<Record<GameId, number>>;
      for (const id of ALL_GAME_IDS) {
        if (parsed[id] !== undefined) state.mastery[id] = parsed[id]!;
      }
    }

    const rawOnboarded = localStorage.getItem("lf_onboarded_v1");
    if (rawOnboarded) state.onboarded = JSON.parse(rawOnboarded) as GameId[];

    const rawCount = localStorage.getItem("lf_play_count_v1");
    if (rawCount) {
      const parsed = JSON.parse(rawCount) as Partial<Record<GameId, number>>;
      for (const id of ALL_GAME_IDS) {
        if (parsed[id] !== undefined) state.playCount[id] = parsed[id]!;
      }
    }

    return state;
  } catch {
    return makeDefaultState();
  }
}

function saveResult(
  state: GameState,
  gameId: GameId,
  score: number
): GameState {
  const prevBest = state.highScores[gameId] ?? 0;
  const isNewBest = score > prevBest;
  const xpGained = Math.max(1, Math.floor(score * 0.4));

  const prevMastery = state.mastery[gameId] ?? 0;
  // Normalize score to 0-100 for mastery calc (assuming max score ~1000 per game)
  const normalizedScore = Math.min(100, score / 10);
  const newMastery = Math.round(prevMastery * 0.6 + normalizedScore * 0.4);

  const next: GameState = {
    highScores: {
      ...state.highScores,
      [gameId]: isNewBest ? score : prevBest,
    },
    mastery: {
      ...state.mastery,
      [gameId]: newMastery,
    },
    onboarded: state.onboarded,
    totalXP: state.totalXP + xpGained,
    playCount: {
      ...state.playCount,
      [gameId]: (state.playCount[gameId] ?? 0) + 1,
    },
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("lf_game_scores_v2", JSON.stringify(next.highScores));
      localStorage.setItem("lf_game_xp_v2", String(next.totalXP));
      localStorage.setItem("lf_game_mastery_v1", JSON.stringify(next.mastery));
      localStorage.setItem("lf_play_count_v1", JSON.stringify(next.playCount));
    } catch {
      // ignore storage errors
    }
  }

  return next;
}

function markOnboarded(state: GameState, gameId: GameId): GameState {
  if (state.onboarded.includes(gameId)) return state;
  const next: GameState = { ...state, onboarded: [...state.onboarded, gameId] };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("lf_onboarded_v1", JSON.stringify(next.onboarded));
    } catch {
      // ignore
    }
  }
  return next;
}

function isOnboarded(state: GameState, gameId: GameId): boolean {
  return state.onboarded.includes(gameId);
}

function getMasteryLevel(mastery: number): MasteryLevel {
  if (mastery >= 80) return "Master";
  if (mastery >= 60) return "Expert";
  if (mastery >= 40) return "Skilled";
  if (mastery >= 20) return "Apprentice";
  return "Novice";
}

function getDifficultyForGame(state: GameState, gameId: GameId): DifficultyTier {
  const count = state.playCount[gameId] ?? 0;
  if (count >= 5) return "MASTER";
  if (count >= 2) return "SKILLED";
  return "ENTRY";
}

export const GameEngine = {
  loadState,
  saveResult,
  markOnboarded,
  isOnboarded,
  getMasteryLevel,
  getDifficultyForGame,
};

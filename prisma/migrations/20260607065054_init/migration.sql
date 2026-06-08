-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "fifa_code" TEXT,
    "country" TEXT,
    "fifa_ranking" INTEGER,
    "elo_rating" REAL,
    "world_cup_appearances" INTEGER DEFAULT 0,
    "world_cup_titles" INTEGER DEFAULT 0,
    "best_world_cup_result" TEXT,
    "total_matches" INTEGER DEFAULT 0,
    "total_wins" INTEGER DEFAULT 0,
    "total_draws" INTEGER DEFAULT 0,
    "total_losses" INTEGER DEFAULT 0,
    "goals_for" INTEGER DEFAULT 0,
    "goals_against" INTEGER DEFAULT 0,
    "recent_5_wins" INTEGER DEFAULT 0,
    "recent_5_draws" INTEGER DEFAULT 0,
    "recent_5_losses" INTEGER DEFAULT 0,
    "recent_10_wins" INTEGER DEFAULT 0,
    "recent_10_draws" INTEGER DEFAULT 0,
    "recent_10_losses" INTEGER DEFAULT 0,
    "avg_goals_for" REAL DEFAULT 0,
    "avg_goals_against" REAL DEFAULT 0,
    "injury_score" REAL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competition" TEXT,
    "match_stage" TEXT,
    "match_date" DATETIME NOT NULL,
    "home_team_id" TEXT NOT NULL,
    "away_team_id" TEXT NOT NULL,
    "neutral_ground" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "actual_home_score" INTEGER,
    "actual_away_score" INTEGER,
    "actual_result" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "odds_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "match_id" TEXT NOT NULL,
    "bookmaker" TEXT NOT NULL,
    "initial_home_win" REAL NOT NULL,
    "initial_draw" REAL NOT NULL,
    "initial_away_win" REAL NOT NULL,
    "current_home_win" REAL NOT NULL,
    "current_draw" REAL NOT NULL,
    "current_away_win" REAL NOT NULL,
    "home_change" REAL,
    "draw_change" REAL,
    "away_change" REAL,
    "home_change_rate" REAL,
    "draw_change_rate" REAL,
    "away_change_rate" REAL,
    "is_major_bookmaker" BOOLEAN NOT NULL DEFAULT false,
    "is_abnormal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "odds_records_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "match_id" TEXT NOT NULL,
    "model_version" TEXT,
    "home_base_score" REAL,
    "away_base_score" REAL,
    "market_score" REAL,
    "home_win_probability" REAL NOT NULL,
    "draw_probability" REAL NOT NULL,
    "away_win_probability" REAL NOT NULL,
    "main_direction" TEXT,
    "confidence" TEXT,
    "risk_level" TEXT,
    "risk_reasons" TEXT,
    "report_text" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "predictions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "virtual_simulations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "match_id" TEXT NOT NULL,
    "prediction_id" TEXT NOT NULL,
    "virtual_bankroll" REAL NOT NULL,
    "suggested_min_amount" REAL NOT NULL,
    "suggested_max_amount" REAL NOT NULL,
    "risk_level" TEXT,
    "simulation_note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "virtual_simulations_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "virtual_simulations_prediction_id_fkey" FOREIGN KEY ("prediction_id") REFERENCES "predictions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "model_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "match_id" TEXT NOT NULL,
    "prediction_id" TEXT NOT NULL,
    "actual_result" TEXT,
    "predicted_result" TEXT,
    "prediction_hit" BOOLEAN,
    "probability_error" REAL,
    "review_summary" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "model_reviews_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "model_reviews_prediction_id_fkey" FOREIGN KEY ("prediction_id") REFERENCES "predictions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");

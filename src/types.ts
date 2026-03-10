// ── Biomarker flags ──

export type BiomarkerFlag = "normal" | "borderline" | "high" | "low";

export interface BiomarkerReading {
  value: number;
  unit: string;
  date: string; // YYYY-MM-DD
  flag: BiomarkerFlag;
}

// ── User profile ──

export interface UserProfile {
  user: {
    name: string;
    age: number;
    city: string;
    occupation: string;
    household: string;
  };

  identity: {
    proud_at_60_statement: string;
    primary_fear: string;
    motivation_style: "toward" | "away_from";
  };

  biomarkers: {
    hba1c: BiomarkerReading;
    fasting_glucose: BiomarkerReading;
    total_cholesterol: BiomarkerReading;
    ldl: BiomarkerReading;
    hdl: BiomarkerReading;
    triglycerides: BiomarkerReading;
    vitamin_d: BiomarkerReading;
    tsh: BiomarkerReading;
    creatinine: BiomarkerReading;
    uric_acid: BiomarkerReading;
  };

  lifestyle: {
    sleep_hours_avg: number;
    sleep_quality: "poor" | "fair" | "good";
    exercise_type: string;
    exercise_frequency_per_week: number;
    meal_control: "full" | "partial" | "low";
    alcohol: "none" | "occasional" | "regular";
    stress_level: "low" | "medium" | "high";
    screen_time_after_9pm: "yes" | "no" | "sometimes";
  };

  chaos_context: {
    this_week_description: string;
    travel: boolean;
    festival_or_event: string | null;
    work_intensity: "normal" | "heavy" | "light";
    family_demands: "normal" | "high";
  };

  recent_checkins: CheckIn[];
  action_history: ActionRecord[];
  coach_notes: string[];
  focus_biomarker: string;
}

export interface CheckIn {
  date: string;
  action_taken: boolean;
  notes: string;
  energy_level: number; // 1-5
  sleep_last_night: number;
}

export interface ActionRecord {
  date: string;
  action: string;
  category: ActionCategory;
}

export type ActionCategory =
  | "nutrition"
  | "movement"
  | "sleep"
  | "stress"
  | "hydration";

// ── Engine output ──

export interface NBAOutput {
  message: string;
  metadata: {
    action_category: ActionCategory;
    action_summary: string;
    biomarker_targeted: string;
    chaos_adjusted: boolean;
    identity_anchor_used: boolean;
    difficulty_level: "easy" | "medium" | "hard";
    estimated_minutes: number;
  };
}

export interface EveningCheckInOutput {
  message: string;
  action_taken: boolean;
  coach_note?: string;
}

export interface WeeklySummaryOutput {
  message: string;
}

// ── Evaluation ──

export interface EvalResult {
  pass: boolean;
  critique: string;
}

// ── Engine mode ──

export type EngineMode = "morning" | "evening" | "weekly";

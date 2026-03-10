import type { UserProfile } from "./types.js";

/**
 * Three test scenarios matching the spec's sample outputs.
 */

export const testUserRahul: UserProfile = {
  user: {
    name: "Rahul",
    age: 37,
    city: "Bangalore",
    occupation: "Engineering Manager at a fintech startup",
    household: "nuclear, wife cooks most meals",
  },
  identity: {
    proud_at_60_statement: "I want to be the dad who runs a half marathon with his kids and still has the energy to mentor young engineers.",
    primary_fear: "Ending up diabetic like my father, on meds by 50.",
    motivation_style: "away_from",
  },
  biomarkers: {
    hba1c: { value: 6.1, unit: "%", date: "2026-02-15", flag: "borderline" },
    fasting_glucose: { value: 112, unit: "mg/dL", date: "2026-02-15", flag: "borderline" },
    total_cholesterol: { value: 210, unit: "mg/dL", date: "2026-02-15", flag: "borderline" },
    ldl: { value: 128, unit: "mg/dL", date: "2026-02-15", flag: "borderline" },
    hdl: { value: 42, unit: "mg/dL", date: "2026-02-15", flag: "low" },
    triglycerides: { value: 165, unit: "mg/dL", date: "2026-02-15", flag: "borderline" },
    vitamin_d: { value: 22, unit: "ng/mL", date: "2026-02-15", flag: "low" },
    tsh: { value: 3.2, unit: "uIU/mL", date: "2026-02-15", flag: "normal" },
    creatinine: { value: 0.9, unit: "mg/dL", date: "2026-02-15", flag: "normal" },
    uric_acid: { value: 6.1, unit: "mg/dL", date: "2026-02-15", flag: "normal" },
  },
  lifestyle: {
    sleep_hours_avg: 6.5,
    sleep_quality: "fair",
    exercise_type: "running 2x/week, occasional walks",
    exercise_frequency_per_week: 2,
    meal_control: "partial",
    alcohol: "occasional",
    stress_level: "high",
    screen_time_after_9pm: "yes",
  },
  chaos_context: {
    this_week_description: "Heavy sprint week, three back-to-back product reviews. Likely eating at desk.",
    travel: false,
    festival_or_event: null,
    work_intensity: "heavy",
    family_demands: "normal",
  },
  recent_checkins: [
    { date: "2026-03-07", action_taken: true, notes: "Did the walk after lunch, felt good", energy_level: 3, sleep_last_night: 6 },
    { date: "2026-03-08", action_taken: false, notes: "Got stuck in meetings, skipped", energy_level: 2, sleep_last_night: 5.5 },
    { date: "2026-03-09", action_taken: true, notes: "Had the dal instead of ordering pizza", energy_level: 3, sleep_last_night: 6.5 },
  ],
  action_history: [
    { date: "2026-03-05", action: "Post-lunch 15 min walk", category: "movement" },
    { date: "2026-03-06", action: "Replace evening chai biscuits with handful of almonds", category: "nutrition" },
    { date: "2026-03-07", action: "Post-lunch 15 min walk", category: "movement" },
    { date: "2026-03-08", action: "2 glasses of water before lunch", category: "hydration" },
    { date: "2026-03-09", action: "Choose dal rice over ordering pizza", category: "nutrition" },
  ],
  focus_biomarker: "",
};

export const testUserPriya: UserProfile = {
  user: {
    name: "Priya",
    age: 34,
    city: "Mumbai",
    occupation: "Product Lead at an edtech company",
    household: "joint family, mother-in-law cooks",
  },
  identity: {
    proud_at_60_statement: "I want to be fit enough to travel the world with my partner and not be limited by my body.",
    primary_fear: "Low energy becoming my baseline, not being able to keep up.",
    motivation_style: "toward",
  },
  biomarkers: {
    hba1c: { value: 5.4, unit: "%", date: "2026-01-20", flag: "normal" },
    fasting_glucose: { value: 92, unit: "mg/dL", date: "2026-01-20", flag: "normal" },
    total_cholesterol: { value: 195, unit: "mg/dL", date: "2026-01-20", flag: "normal" },
    ldl: { value: 115, unit: "mg/dL", date: "2026-01-20", flag: "normal" },
    hdl: { value: 55, unit: "mg/dL", date: "2026-01-20", flag: "normal" },
    triglycerides: { value: 130, unit: "mg/dL", date: "2026-01-20", flag: "normal" },
    vitamin_d: { value: 14, unit: "ng/mL", date: "2026-01-20", flag: "low" },
    tsh: { value: 2.8, unit: "uIU/mL", date: "2026-01-20", flag: "normal" },
    creatinine: { value: 0.7, unit: "mg/dL", date: "2026-01-20", flag: "normal" },
    uric_acid: { value: 4.5, unit: "mg/dL", date: "2026-01-20", flag: "normal" },
  },
  lifestyle: {
    sleep_hours_avg: 7,
    sleep_quality: "fair",
    exercise_type: "yoga 2x/week",
    exercise_frequency_per_week: 2,
    meal_control: "low",
    alcohol: "none",
    stress_level: "medium",
    screen_time_after_9pm: "sometimes",
  },
  chaos_context: {
    this_week_description: "Diwali week. Family visiting, sweets everywhere. Mother-in-law has cooked up a storm.",
    travel: false,
    festival_or_event: "Diwali",
    work_intensity: "light",
    family_demands: "high",
  },
  recent_checkins: [
    { date: "2026-03-07", action_taken: true, notes: "Got 20 mins of sun during morning tea", energy_level: 3, sleep_last_night: 7 },
    { date: "2026-03-08", action_taken: true, notes: "Took the stairs all day", energy_level: 4, sleep_last_night: 7.5 },
    { date: "2026-03-09", action_taken: false, notes: "Festival prep took over, no time", energy_level: 3, sleep_last_night: 6 },
  ],
  action_history: [
    { date: "2026-03-05", action: "Morning sunlight 20 mins", category: "movement" },
    { date: "2026-03-06", action: "Extra glass of water with each meal", category: "hydration" },
    { date: "2026-03-07", action: "Morning sunlight 20 mins", category: "movement" },
    { date: "2026-03-08", action: "Take stairs instead of elevator all day", category: "movement" },
    { date: "2026-03-09", action: "Eat one serving of sabzi before sweets", category: "nutrition" },
  ],
  focus_biomarker: "",
};

export const testUserVikram: UserProfile = {
  user: {
    name: "Vikram",
    age: 41,
    city: "Delhi",
    occupation: "VP of Sales at a SaaS company",
    household: "nuclear, mostly eats out or orders in",
  },
  identity: {
    proud_at_60_statement: "I want to be sharp, present, and not dependent on anyone for my daily life.",
    primary_fear: "Heart attack in my 50s like my uncle. He never saw it coming.",
    motivation_style: "away_from",
  },
  biomarkers: {
    hba1c: { value: 5.7, unit: "%", date: "2026-02-01", flag: "borderline" },
    fasting_glucose: { value: 105, unit: "mg/dL", date: "2026-02-01", flag: "borderline" },
    total_cholesterol: { value: 235, unit: "mg/dL", date: "2026-02-01", flag: "high" },
    ldl: { value: 142, unit: "mg/dL", date: "2026-02-01", flag: "high" },
    hdl: { value: 38, unit: "mg/dL", date: "2026-02-01", flag: "low" },
    triglycerides: { value: 210, unit: "mg/dL", date: "2026-02-01", flag: "high" },
    vitamin_d: { value: 18, unit: "ng/mL", date: "2026-02-01", flag: "low" },
    tsh: { value: 3.5, unit: "uIU/mL", date: "2026-02-01", flag: "normal" },
    creatinine: { value: 1.0, unit: "mg/dL", date: "2026-02-01", flag: "normal" },
    uric_acid: { value: 7.2, unit: "mg/dL", date: "2026-02-01", flag: "high" },
  },
  lifestyle: {
    sleep_hours_avg: 5.5,
    sleep_quality: "poor",
    exercise_type: "nothing regular, occasional weekend walk",
    exercise_frequency_per_week: 1,
    meal_control: "low",
    alcohol: "regular",
    stress_level: "high",
    screen_time_after_9pm: "yes",
  },
  chaos_context: {
    this_week_description: "Business travel to Delhi for client meetings. Three dinners out. Running on hotel sleep.",
    travel: true,
    festival_or_event: null,
    work_intensity: "heavy",
    family_demands: "normal",
  },
  recent_checkins: [
    { date: "2026-03-07", action_taken: false, notes: "Client dinner ran late, couldn't do anything", energy_level: 2, sleep_last_night: 5 },
    { date: "2026-03-08", action_taken: true, notes: "Managed to walk 10 mins before the meeting", energy_level: 2, sleep_last_night: 4.5 },
    { date: "2026-03-09", action_taken: false, notes: "Dead tired, crashed at the hotel", energy_level: 1, sleep_last_night: 5 },
  ],
  action_history: [
    { date: "2026-03-04", action: "Replace one meal with dal + salad", category: "nutrition" },
    { date: "2026-03-05", action: "No phone after 10pm", category: "sleep" },
    { date: "2026-03-06", action: "20 min walk after dinner", category: "movement" },
    { date: "2026-03-07", action: "Order tandoori instead of butter chicken", category: "nutrition" },
    { date: "2026-03-08", action: "10 min morning walk before meetings", category: "movement" },
  ],
  focus_biomarker: "",
};

export const TEST_USERS = {
  rahul: testUserRahul,
  priya: testUserPriya,
  vikram: testUserVikram,
};

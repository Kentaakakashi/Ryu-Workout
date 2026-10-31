import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Profile = {
  user_id: string;
  age_years: number;
  height_cm: number | null;
  weight_kg: number | null;
  sex_for_energy_estimate: string | null;
  primary_goal: string;
  focus_areas: string[];
  experience_level: string;
  equipment: string[];
  available_days: number[];
  session_minutes: number;
  activity_level: string;
  diet_pattern: string;
  dietary_restrictions: string[];
  allergies: string[];
  cuisine_preferences: string[];
  food_budget: string;
  limitations: string;
};

const EXERCISES = [
  { slug: "wall_push_up", name: "Wall push-up", equipment: ["bodyweight"] },
  { slug: "incline_push_up", name: "Incline push-up", equipment: ["bodyweight"] },
  { slug: "knee_push_up", name: "Knee push-up", equipment: ["bodyweight"] },
  { slug: "push_up", name: "Push-up", equipment: ["bodyweight"] },
  { slug: "pike_push_up", name: "Pike push-up", equipment: ["bodyweight"] },
  { slug: "bodyweight_squat", name: "Bodyweight squat", equipment: ["bodyweight"] },
  { slug: "reverse_lunge", name: "Reverse lunge", equipment: ["bodyweight"] },
  { slug: "glute_bridge", name: "Glute bridge", equipment: ["bodyweight"] },
  { slug: "calf_raise", name: "Standing calf raise", equipment: ["bodyweight"] },
  { slug: "dead_bug", name: "Dead bug", equipment: ["bodyweight"] },
  { slug: "bird_dog", name: "Bird dog", equipment: ["bodyweight"] },
  { slug: "plank", name: "Plank", equipment: ["bodyweight"] },
  { slug: "side_plank", name: "Side plank", equipment: ["bodyweight"] },
  { slug: "mountain_climber", name: "Mountain climber", equipment: ["bodyweight"] },
  { slug: "superman", name: "Superman hold", equipment: ["bodyweight"] },
  { slug: "band_row", name: "Resistance-band row", equipment: ["resistance_bands"] },
  { slug: "band_pull_apart", name: "Band pull-apart", equipment: ["resistance_bands"] },
  { slug: "dumbbell_row", name: "Dumbbell row", equipment: ["dumbbells"] },
  { slug: "dumbbell_press", name: "Dumbbell floor press", equipment: ["dumbbells"] },
  { slug: "dumbbell_rdl", name: "Dumbbell Romanian deadlift", equipment: ["dumbbells"] },
  { slug: "dumbbell_curl", name: "Dumbbell curl", equipment: ["dumbbells"] },
  { slug: "gym_lat_pulldown", name: "Lat pulldown", equipment: ["gym_access"] },
  { slug: "gym_leg_press", name: "Leg press", equipment: ["gym_access"] },
  { slug: "gym_chest_press", name: "Machine chest press", equipment: ["gym_access"] },
  { slug: "gym_seated_row", name: "Seated cable row", equipment: ["gym_access"] },
];

const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function textValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim().slice(0, 1200) : fallback;
}

function boundedInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
}

function assessBody(profile: Profile) {
  if (profile.age_years < 18) {
    return {
      mode: "growth_context",
      label: "Your body is still developing",
      bmi: null,
      explanation: "Ryu does not apply adult BMI categories or adult calorie calculators to people under 18. Growth is assessed using age- and sex-specific clinical references. This plan focuses on age-appropriate movement, regular balanced meals and recovery. Talk with a parent or guardian and a qualified healthcare professional if you are concerned about weight or growth.",
    };
  }
  if (!profile.height_cm || !profile.weight_kg) {
    return {
      mode: "not_enough_information",
      label: "Your body overview is incomplete",
      bmi: null,
      explanation: "Height and weight were not both provided, so Ryu will not classify your measurements. You can add them later if you wish.",
    };
  }
  const bmi = profile.weight_kg / Math.pow(profile.height_cm / 100, 2);
  let label = "Within the general adult BMI reference range";
  let category = "reference_range";
  if (bmi < 18.5) {
    label = "Adult BMI screening: underweight range";
    category = "underweight_screening";
  } else if (bmi >= 30) {
    label = "Adult BMI screening: higher range";
    category = "higher_screening";
  } else if (bmi >= 25) {
    label = "Adult BMI screening: above reference range";
    category = "above_reference_screening";
  }
  return {
    mode: "adult_screening",
    category,
    label,
    bmi: Number(bmi.toFixed(1)),
    explanation: "BMI is a screening measure, not a diagnosis or a complete picture of health. It does not measure body composition. A clinician can interpret it alongside your health history and other measurements.",
  };
}

function energyGuidance(profile: Profile, assessment: ReturnType<typeof assessBody>) {
  if (profile.age_years < 18) {
    return {
      mode: "guidance_only",
      calorie_min: null,
      calorie_max: null,
      rationale: "Ryu does not assign a fixed calorie target to users under 18. Energy needs change during growth and should be assessed with an appropriate healthcare professional. Focus on regular meals, snacks when hungry, variety and enough food to support daily activity.",
    };
  }
  if (assessment.mode === "adult_screening" && assessment.category === "underweight_screening") {
    return {
      mode: "professional_review",
      calorie_min: null,
      calorie_max: null,
      rationale: "Your measurements fall in the adult underweight screening range. Please review this with a qualified healthcare professional before using a calorie target or weight-change plan.",
    };
  }
  if (!profile.height_cm || !profile.weight_kg || !profile.sex_for_energy_estimate || profile.sex_for_energy_estimate === "prefer_not_to_say") {
    return {
      mode: "guidance_only",
      calorie_min: null,
      calorie_max: null,
      rationale: "A personal energy estimate needs more information. Ryu will show balanced meal guidance rather than guess a calorie target. You can update your optional details later.",
    };
  }
  const bmr = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age_years +
    (profile.sex_for_energy_estimate === "male" ? 5 : -161);
  const maintenance = bmr * (ACTIVITY_FACTORS[profile.activity_level] || 1.375);
  let adjustment = 0;
  if (profile.primary_goal === "build_muscle") adjustment = Math.min(200, maintenance * 0.08);
  else if (profile.primary_goal === "lose_fat") adjustment = -Math.min(200, maintenance * 0.08);
  const center = Math.round((maintenance + adjustment) / 50) * 50;
  return {
    mode: "estimated_range",
    calorie_min: Math.max(Math.ceil(bmr / 50) * 50, center - 100),
    calorie_max: center + 100,
    rationale: "This is a broad adult estimate based on the information you supplied, not a medical prescription. Actual needs vary with health, activity, body composition and day-to-day variation.",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond(405, { error: "Use POST for plan generation." });

  const authorization = req.headers.get("Authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return respond(401, { error: "Please sign in again to generate your plan." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableMap = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  let publishableKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (publishableMap) {
    try { publishableKey = JSON.parse(publishableMap).default || publishableKey; } catch { /* use legacy anon key */ }
  }
  if (!supabaseUrl || !publishableKey) return respond(500, { error: "Ryu's secure backend is not configured correctly." });

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const token = authorization.slice(7);
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) return respond(401, { error: "Your session could not be verified. Please sign in again." });

  const { data: rawProfile, error: profileError } = await supabase
    .from("fitness_profiles")
    .select("*")
    .eq("user_id", userData.user.id)
    .single();
  if (profileError || !rawProfile) return respond(404, { error: "Finish your personalisation questions before generating a plan." });
  if (rawProfile.onboarding_status !== "completed") return respond(409, { error: "Save the final onboarding step before generating your plan." });

  const profile = rawProfile as Profile;
  if (!Number.isInteger(profile.age_years) || profile.age_years < 13 || profile.age_years > 110 ||
      !Array.isArray(profile.available_days) || profile.available_days.length < 1 ||
      !Number.isInteger(profile.session_minutes) || profile.session_minutes < 5 || profile.session_minutes > 180) {
    return respond(400, { error: "Your saved profile is missing required training details." });
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return respond(503, {
    error: "The AI engine is not connected yet. Add GEMINI_API_KEY to Supabase Edge Function secrets, then try again.",
    needs_configuration: true,
  });

  const allowedExercises = EXERCISES.filter(exercise => exercise.equipment.every(item => profile.equipment.includes(item)));
  const allowedSlugs = new Set(allowedExercises.map(exercise => exercise.slug));
  if (!allowedExercises.length) return respond(400, { error: "Select available equipment so Ryu can build suitable exercises." });

  const profileForModel = {
    age_years: profile.age_years,
    height_cm: profile.height_cm,
    weight_kg: profile.weight_kg,
    primary_goal: profile.primary_goal,
    focus_areas: profile.focus_areas,
    experience_level: profile.experience_level,
    equipment: profile.equipment,
    available_days: profile.available_days,
    session_minutes: profile.session_minutes,
    activity_level: profile.activity_level,
    diet_pattern: profile.diet_pattern,
    dietary_restrictions: profile.dietary_restrictions,
    allergies: profile.allergies,
    cuisine_preferences: profile.cuisine_preferences,
    food_budget: profile.food_budget,
    limitations: profile.limitations,
  };

  const prompt = [
    "Create a practical, friendly seven-day Ryu training and meal proposal. Return valid JSON only.",
    "Required JSON shape:",
    '{"title":"string","summary":"2-3 specific sentences","coach_message":"short welcome","weekly_focus":"string","schedule":[{"weekday":0,"day_type":"workout|recovery|rest","title":"string","focus":"string","session_minutes":30,"description":"string","exercises":[{"exercise_slug":"catalogue slug","instructions":"short cues","sets":2,"reps_min":8,"reps_max":12,"duration_seconds":null,"rest_seconds":60,"alternatives":["catalogue slug"]}]}],"meals":[{"weekday":0,"meal_slot":"breakfast|lunch|snack|dinner","name":"string","description":"string","ingredients":["string"],"portion_guidance":"string","preparation_minutes":15}],"milestones":[{"week":2,"title":"string","description":"habit or skill milestone, never a promised body transformation"}]}',
    "Include exactly seven schedule days (0 Sunday to 6 Saturday) and 3-4 meal ideas per day.",
    "Only schedule workouts on these available days: " + JSON.stringify(profile.available_days) + ". Other days must be rest or gentle recovery without prescribed sets.",
    "Keep each session at or below " + profile.session_minutes + " minutes. Respect experience: " + profile.experience_level + ". Use manageable, technique-first volume.",
    "Equipment available: " + JSON.stringify(profile.equipment) + ". Allowed exercise catalogue: " + JSON.stringify(allowedExercises) + ". Use only these exercise slugs.",
    "Goal: " + profile.primary_goal + ". Focus: " + JSON.stringify(profile.focus_areas) + ". Balance movement patterns and recovery. Do not work the same muscle groups hard on consecutive days.",
    "Each workout day: 2-6 exercises. Sets 1-4. Reps 5-20 or a timed duration. Rest 30-150 seconds. Do not invent advanced or risky movements.",
    "Food pattern: " + profile.diet_pattern + ". Restrictions: " + JSON.stringify(profile.dietary_restrictions) + ". Allergies: " + JSON.stringify(profile.allergies) + ". Cuisine: " + JSON.stringify(profile.cuisine_preferences) + ". Budget: " + profile.food_budget + ".",
    "Prefer affordable, ordinary ingredients, realistic preparation and culturally flexible meals. Never include a declared allergen. Suggestions are not claims about food eaten.",
    "Do not calculate BMI, classify body weight, generate calorie targets or promise transformation dates. The server computes measurement context and energy guidance separately.",
    "Avoid diagnosis, supplements as necessities, aggressive bulking/cutting or exercise through pain. Work around these limitations: " + profile.limitations,
    "User profile: " + JSON.stringify(profileForModel),
  ].join("\\n");

  const generation = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You are Ryu's structured fitness-plan generator. Respect the profile exactly. Never invent measurements." }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.35, maxOutputTokens: 6500 },
      }),
    },
  );

  if (!generation.ok) {
    const detail = await generation.text();
    console.error("Plan generation provider error", generation.status, detail.slice(0, 400));
    return respond(502, { error: "Ryu couldn't generate your plan right now. Please try again." });
  }

  const response = await generation.json();
  const rawText = response.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || "";
  let result: Record<string, unknown>;
  try { result = JSON.parse(rawText); }
  catch { return respond(502, { error: "The AI returned an incomplete plan. Please retry." }); }

  if (typeof result.title !== "string" || typeof result.summary !== "string" ||
      !Array.isArray(result.schedule) || !Array.isArray(result.meals) || !Array.isArray(result.milestones)) {
    return respond(502, { error: "The AI response did not match Ryu's plan structure. Please retry." });
  }

  const dayRows = result.schedule as Array<Record<string, unknown>>;
  const weekdays = new Set(dayRows.map(day => Number(day.weekday)));
  if (dayRows.length !== 7 || weekdays.size !== 7 || [...Array(7).keys()].some(day => !weekdays.has(day))) {
    return respond(502, { error: "Ryu received an incomplete weekly schedule. Please retry." });
  }

  const schedule = dayRows.sort((a, b) => Number(a.weekday) - Number(b.weekday)).map(day => {
    const weekday = Number(day.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new Error("Invalid weekday");
    const available = profile.available_days.includes(weekday);
    if (!available || day.day_type === "rest") {
      return {
        weekday, day_type: "rest", title: textValue(day.title, "Rest and recover"),
        focus: textValue(day.focus), session_minutes: null,
        description: textValue(day.description), exercises: [],
      };
    }
    if (day.day_type !== "workout" && day.day_type !== "recovery") throw new Error("Invalid day type");
    if (!Array.isArray(day.exercises) || day.exercises.length < 1 || day.exercises.length > 6) throw new Error("Invalid exercise count");
    const exercises = (day.exercises as Array<Record<string, unknown>>).map(exercise => {
      const slug = String(exercise.exercise_slug || "");
      if (!allowedSlugs.has(slug)) throw new Error("Exercise does not match selected equipment");
      const timed = exercise.duration_seconds !== null && exercise.duration_seconds !== undefined;
      const repsMin = timed ? null : boundedInt(exercise.reps_min, 5, 20, 8);
      const repsMax = timed ? null : boundedInt(exercise.reps_max, 5, 20, 12);
      return {
        exercise_slug: slug,
        instructions: textValue(exercise.instructions, "Move with control. Stop if a movement causes pain."),
        sets: boundedInt(exercise.sets, 1, 4, 2),
        reps_min: repsMin,
        reps_max: repsMax,
        duration_seconds: timed ? boundedInt(exercise.duration_seconds, 10, 180, 30) : null,
        rest_seconds: boundedInt(exercise.rest_seconds, 30, 150, 60),
        alternatives: Array.isArray(exercise.alternatives)
          ? exercise.alternatives.filter((item: unknown) => allowedSlugs.has(String(item))).slice(0, 3)
          : [],
      };
    });
    return {
      weekday,
      day_type: day.day_type,
      title: textValue(day.title, "Training day"),
      focus: textValue(day.focus, "Full body"),
      session_minutes: boundedInt(day.session_minutes, 5, profile.session_minutes, profile.session_minutes),
      description: textValue(day.description),
      exercises,
    };
  });

  const mealRows = (result.meals as Array<Record<string, unknown>>).filter(meal =>
    Number.isInteger(meal.weekday) && Number(meal.weekday) >= 0 && Number(meal.weekday) <= 6 &&
    ["breakfast", "lunch", "snack", "dinner"].includes(String(meal.meal_slot)) &&
    typeof meal.name === "string" && Array.isArray(meal.ingredients)
  ).slice(0, 28);
  if (mealRows.length < 21) return respond(502, { error: "Ryu couldn't complete the weekly meal suggestions. Please retry." });

  const meals = mealRows.map(meal => ({
    weekday: Number(meal.weekday),
    meal_slot: String(meal.meal_slot),
    name: textValue(meal.name, "Balanced meal"),
    description: textValue(meal.description),
    ingredients: (meal.ingredients as unknown[]).filter(item => typeof item === "string").slice(0, 12),
    portion_guidance: textValue(meal.portion_guidance),
    preparation_minutes: boundedInt(meal.preparation_minutes, 0, 240, 20),
  }));

  const assessment = assessBody(profile);
  const energy = energyGuidance(profile, assessment);
  const milestones = (result.milestones as Array<Record<string, unknown>>).slice(0, 5).map(item => ({
    week: boundedInt(item.week, 1, 52, 2),
    title: textValue(item.title),
    description: textValue(item.description),
  }));

  return respond(200, {
    model: "gemini-3.8-flash",
    overview: {
      title: textValue(result.title, "Your Ryu plan"),
      summary: textValue(result.summary),
      coach_message: textValue(result.coach_message),
      weekly_focus: textValue(result.weekly_focus),
      milestones,
    },
    body_assessment: assessment,
    energy_guidance: energy,
    nutrition: {
      fueling_summary: "Build a steady routine with meals that suit your preferences and support your training.",
      protein_guidance: "Include a suitable protein source across meals. Exact needs depend on age, health and activity.",
      hydration_guidance: "Drink regularly through the day and around activity; adjust for heat and sweat.",
      safety_note: profile.age_years < 18
        ? "Because you are under 18, this plan avoids adult BMI labels and fixed calorie targets. A parent or guardian and qualified healthcare professional should help with weight or growth concerns."
        : energy.mode === "professional_review"
          ? "Please review weight-related goals and nutrition targets with a qualified healthcare professional before making changes."
          : "Nutrition estimates are guidance, not medical advice. Seek professional guidance for medical conditions, allergies or a history of disordered eating.",
      energy_mode: energy.mode,
      calorie_min: energy.calorie_min,
      calorie_max: energy.calorie_max,
      energy_rationale: energy.rationale,
      meals,
    },
    schedule,
  });
});

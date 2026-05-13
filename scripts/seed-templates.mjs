import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

// ============================================================
// 1. PERIODIZATION OVERVIEW TEMPLATE
// ============================================================
const periodizationContent = {
  html: `<h2>Overview</h2>
<p>This program is designed as a comprehensive health optimization protocol combining structured resistance training, neuroplastic development, targeted supplementation, and lifestyle modifications. The goal is to build lean tissue, optimize recovery, improve cognitive function, and establish long-term health foundations.</p>
<p>We will be utilizing a 2-week rotating mesocycle alternating between <strong>Damage/Alactic emphasis</strong> (Week 1) and <strong>Oxygen/Glycolytic emphasis</strong> (Week 2) to drive progressive tension overload while managing recovery.</p>

<h2>Bloodwork Recommendations</h2>
<p>Comprehensive metabolic panel, complete blood count, lipid panel, thyroid panel (TSH, Free T3, Free T4), hormone panel (Total/Free Testosterone, Estradiol, DHEA-S, Pregnenolone, IGF-1, SHBG), inflammatory markers (CRP, ESR), vitamin D, B12, folate, iron panel, and fasting insulin/glucose.</p>
<p>Recommended frequency: baseline labs before starting, then every 90 days to track progress and adjust protocol accordingly.</p>

<h2>Primary Goals</h2>
<p>Build lean tissue and use calories to fuel recovery. Optimize hormonal environment through targeted supplementation and lifestyle changes. Establish proper neuroplastic foundations for long-term cognitive health. Regain overall resilience before introducing higher-intensity energy system work.</p>

<h2>Secondary Goals</h2>
<p>Improve nasal breathing patterns throughout the day. Establish consistent circadian rhythm through AM/PM light exposure protocols. Develop positive mental frameworks and stress management techniques. Optimize nutrient partitioning through proper meal timing and gut health.</p>

<h2>Short Term Goals (30-90 Days)</h2>
<p>Establish consistent training adherence with the 2-week rotation. Dial in nutrition macros and meal timing. Build the daily neuroplastic routine into a habit. Improve mind-to-muscle connection and progressive overload on all lifts. Adapt to nasal breathing during training.</p>

<h2>Long Term Goals (6-12 Months)</h2>
<p>Significant lean tissue accrual with improved body composition. Measurable improvements in bloodwork markers. Enhanced cognitive function and stress resilience. Full adaptation to all lifestyle protocols (breathing, sun exposure, circadian work). Introduction of higher-intensity energy system work once resilience is established.</p>

<h2>Upcoming Dates</h2>
<p>Next bloodwork panel: [To be scheduled]</p>
<p>90-day program review: [To be scheduled]</p>
<p>Check-in cadence: Weekly via app messaging</p>

<h2>Baseline Hormone Optimization</h2>
<p>Current protocol items are designed to support baseline hormonal optimization. DHEA (100mg AM) for neuroprotection, Pregnenolone (10mg sublingual AM) for BDNF/NGF support, and targeted supplementation to support liver, kidney, and gut health as foundations for proper hormone metabolism.</p>

<h2>Assessment</h2>
<p>Initial assessment to be completed during first week. Track: body weight, training logs (weights/reps), subjective energy levels, sleep quality, mood, and adherence to all protocol components. Progress photos recommended every 30 days.</p>`
};

// ============================================================
// 2. TRAINING SPLIT OVERVIEW TEMPLATE
// ============================================================
const trainingSplitContent = {
  phases: [
    {
      name: "Week 1 - Damage / Alactic Emphasis",
      weeks: "Week 1",
      color: "#ef4444",
      notes: `<h3>Split Overview</h3>
<p><strong>Day 1:</strong> Push - Alactic Emphasis</p>
<p><strong>Day 2:</strong> Pull - Alactic Emphasis</p>
<p><strong>Day 3:</strong> Mobility Day</p>
<p><strong>Day 4:</strong> Legs - Alactic Emphasis</p>
<p><strong>Day 5:</strong> Athletic Day</p>
<p><strong>Day 6:</strong> REST</p>
<p><strong>Day 7:</strong> REST</p>

<h3>Key Training Notes</h3>
<ul>
<li>Rest periods are kept to <strong>60-90s max</strong></li>
<li>Only mouth breathe when absolutely needed - try to keep <strong>nasal breathing patterns</strong> throughout to change blood/air carbon dioxide values, push NO production through epithelial diffusion, improve baseline energetic fluxing, and alter site specific pH cell fluxing</li>
<li>Every set needs to be completed with a high level of <strong>EFFORT</strong> - take every set to mechanical failure meaning you cannot complete another rep with good form. This is NOT true failure.</li>
<li>Always perform a <strong>full range of motion</strong> unless specifically noted otherwise.</li>
<li>We will be counting <strong>DIRECT working volume</strong> and not INDIRECT so numbers may vary.</li>
<li>The goal is always <strong>progressive tension overload</strong> - over time you WILL be adding weight to the bar while we undulate through various volume amounts.</li>
<li>Tempo should always be <strong>slow and controlled</strong> unless specifically noted.</li>
</ul>

<h3>Day 1: Push - Alactic Emphasis</h3>
<ul>
<li><strong>Incline Dumbbell Press:</strong> 2 working sets, 1st set 4-8 reps, 2nd set 10-15 reps, slow controlled tempo</li>
<li><strong>Flat Dumbbell Press:</strong> 2 working sets 8-12 reps, 2 count pause in fully lengthened position</li>
<li><strong>Pec Deck Mid Pec Fly:</strong> 3 working sets 8-12 reps, 2 count pause in fully shortened position</li>
<li><strong>Dumbbell Shoulder Press:</strong> 2 working sets, 1st set 4-8 reps, 2nd set 10-15 reps, slow controlled tempo</li>
<li><strong>Cable Lateral:</strong> 2 working sets 8-12 reps, 2 count pause in fully shortened position</li>
<li><strong>Dumbbell Rear Delt Flys:</strong> 3 working sets 8-12 reps, 2 count pause in fully shortened position</li>
</ul>

<h3>Day 2: Pull - Alactic Emphasis</h3>
<ul>
<li><strong>Weighted Pull-Ups (or Neutral-Grip Lat Pulldown):</strong> 2 working sets, 1st set 4-8 reps, 2nd set 10-15 reps, slow controlled tempo</li>
<li><strong>Chest-Supported Row (DB or machine):</strong> 2 working sets 8-12 reps, 2 count pause in fully lengthened position</li>
<li><strong>Seated Cable Row (close/neutral grip):</strong> 2 working sets 8-12 reps, 2 count pause in fully shortened position</li>
<li><strong>Straight-Arm Pulldown:</strong> 3 working sets 8-12 reps, 2 count pause in fully shortened position</li>
<li><strong>Cable Face Pull:</strong> 2 working sets 8-12 reps, 2 count pause in fully shortened position</li>
<li><strong>Incline Dumbbell Curl (or Cable Curl):</strong> 2 working sets, 1st set 4-8 reps, 2nd set 10-15 reps, slow controlled tempo</li>
<li><strong>Hammer Curl (DB or rope):</strong> 2 working sets 8-12 reps, 2 count pause in fully lengthened position</li>
</ul>

<h3>Day 3: Legs - Alactic Emphasis</h3>
<ul>
<li><strong>Leg Extensions:</strong> 3 working sets 8-12 reps, 2 count pause in fully shortened position</li>
<li><strong>Leg Press Normal Stance:</strong> 3 working sets 8-12 reps, 2 count pause in fully lengthened position</li>
<li><strong>Dumbbell Split Squats:</strong> 2 working sets, 1st set 4-8 reps, 2nd set 10-15 reps, slow controlled tempo</li>
<li><strong>Seated Calf Press:</strong> 4 working sets 8-12 reps, 2 count pause in fully lengthened position</li>
<li><strong>Leg Press Calf Press:</strong> 4 working sets 8-12 reps, 2 count pause in fully shortened position</li>
</ul>

<h3>Day 4: Athletic Day</h3>
<ul>
<li><strong>Single Leg Glute Bridges:</strong> 3 sets of 4-8 reps per leg</li>
<li><strong>High Knees:</strong> 2 sets of 30s</li>
<li><strong>Jumping Jacks:</strong> 2 sets of 30s</li>
<li><strong>Jump Rope:</strong> 2 sets (3m max per set)</li>
<li><strong>Box Jump:</strong> 3 sets of 6</li>
<li><strong>Explosive Lunge Jump:</strong> 3 sets of 5 reps per leg</li>
<li><strong>Bodyweight Pushups:</strong> 3 sets for AMRAP</li>
</ul>

<h3>Day 5: Mobility Day</h3>
<ul>
<li><strong>Wall Deadbug Hold:</strong> 2 sets of 3-6 breaths</li>
<li><strong>High Glute Bridge w/ Reaches:</strong> 2 sets of 8-12 reps</li>
<li><strong>Breathing - Reaches to Open Back Ribs:</strong> 1 set of 12-16 reps</li>
<li><strong>Pelvic Tilts (Sagittal):</strong> 1 set of 60s</li>
<li><strong>Superman X Connect:</strong> 2 sets of 6 each side</li>
<li><strong>Side Plank w/ Hip Abduction:</strong> 2 sets of 4-8 reps</li>
<li><strong>Crawling Cat Cow:</strong> 2 sets of 5 each side</li>
<li><strong>Tall Kneeling Slams:</strong> 10-20 throws at 50-100% max</li>
<li><strong>Tall Kneeling Around the World Slams:</strong> 10-20 throws at 50-100% max</li>
</ul>`
    },
    {
      name: "Week 2 - Oxygen / Glycolytic Emphasis",
      weeks: "Week 2",
      color: "#3b82f6",
      notes: `<h3>Split Overview</h3>
<p><strong>Day 1:</strong> Push - Glycolytic Emphasis</p>
<p><strong>Day 2:</strong> Pull - Glycolytic Emphasis</p>
<p><strong>Day 3:</strong> Mobility Day</p>
<p><strong>Day 4:</strong> Legs - Glycolytic Emphasis</p>
<p><strong>Day 5:</strong> Athletic Day</p>
<p><strong>Day 6:</strong> Mobility Day</p>
<p><strong>Day 7:</strong> REST</p>

<h3>Key Training Notes</h3>
<ul>
<li>Rest periods are kept to <strong>60-90s max</strong></li>
<li>Only <strong>nasal breathing</strong> to push NO production through epithelial diffusion, improve baseline energetic fluxing, and alter site specific pH cellular fluxing</li>
<li>Use a load that keeps constant tension and a deep burn; stop <strong>1-2 reps shy of failure</strong> early rounds, last round can flirt with failure</li>
<li>Focus on <strong>pump and metabolic stress</strong> - this is about driving blood flow and metabolic byproduct accumulation</li>
</ul>

<h3>Day 1: Push - Glycolytic Emphasis</h3>
<ul>
<li><strong>Incline Dumbbell Chest Press</strong> supersetted <strong>Flat Barbell Chest Press:</strong> 4 working sets of 20-30 pump reps</li>
<li><strong>Dumbbell Laterals</strong> supersetted <strong>Dumbbell Rear Delt Flys:</strong> 4 working sets of 20-30 pump reps</li>
</ul>

<h3>Day 2: Pull - Glycolytic Emphasis</h3>
<ul>
<li><strong>Neutral-Grip Lat Pulldown</strong> supersetted <strong>Chest-Supported Row:</strong> 4 working sets of 20-30 pump reps (each exercise)</li>
<li><strong>Cable Straight-Arm Pulldown</strong> supersetted <strong>Cable Face Pull (or Reverse Pec Deck):</strong> 4 working sets of 20-30 pump reps (each exercise)</li>
</ul>
<p><em>Keep rest 30-60 seconds between exercises/rounds.</em></p>

<h3>Day 3: Legs - Glycolytic Emphasis</h3>
<ul>
<li><strong>Leg Press Calf Press</strong> supersetted <strong>Seated Calf Press:</strong> 3 working sets of 20-30 pump reps</li>
<li><strong>Leg Press Close Stance</strong> supersetted <strong>Leg Extensions:</strong> 3 working sets of 20-30 pump reps</li>
</ul>

<h3>Day 4: Athletic Day</h3>
<ul>
<li><strong>Single Leg Glute Bridges:</strong> 3 sets of 4-8 reps per leg</li>
<li><strong>High Knees:</strong> 2 sets of 30s</li>
<li><strong>Jumping Jacks:</strong> 2 sets of 30s</li>
<li><strong>Jump Rope:</strong> 2 sets (3m max per set)</li>
<li><strong>Box Jump:</strong> 3 sets of 6</li>
<li><strong>Explosive Lunge Jump:</strong> 3 sets of 5 reps per leg</li>
<li><strong>Bodyweight Pushups:</strong> 3 sets for AMRAP</li>
</ul>

<h3>Day 5: Mobility Day</h3>
<ul>
<li><strong>Wall Deadbug Hold:</strong> 2 sets of 3-6 breaths</li>
<li><strong>High Glute Bridge w/ Reaches:</strong> 2 sets of 8-12 reps</li>
<li><strong>Breathing - Reaches to Open Back Ribs:</strong> 1 set of 12-16 reps</li>
</ul>

<p><strong>REPEAT CYCLE</strong></p>`
    }
  ]
};

// ============================================================
// 3. COMPLETE PROGRAM GUIDE TEMPLATE
// ============================================================
const programGuideContent = {
  tabs: {
    training_split: `<h2>Training Split Details</h2>
<p>This program utilizes a <strong>2-week rotating mesocycle</strong> alternating between Damage/Alactic emphasis (Week 1) and Oxygen/Glycolytic emphasis (Week 2).</p>

<h3>Week 1 - Damage Emphasis (Alactic)</h3>
<table style="width:100%; border-collapse: collapse; margin: 16px 0;">
<tr style="background:#f3f4f6;"><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Day</th><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Focus</th><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Emphasis</th></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Day 1</td><td style="padding:8px; border:1px solid #e5e7eb;">Push</td><td style="padding:8px; border:1px solid #e5e7eb;">Alactic - Heavy/Controlled</td></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Day 2</td><td style="padding:8px; border:1px solid #e5e7eb;">Pull</td><td style="padding:8px; border:1px solid #e5e7eb;">Alactic - Heavy/Controlled</td></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Day 3</td><td style="padding:8px; border:1px solid #e5e7eb;">Mobility</td><td style="padding:8px; border:1px solid #e5e7eb;">Recovery & Movement Quality</td></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Day 4</td><td style="padding:8px; border:1px solid #e5e7eb;">Legs</td><td style="padding:8px; border:1px solid #e5e7eb;">Alactic - Heavy/Controlled</td></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Day 5</td><td style="padding:8px; border:1px solid #e5e7eb;">Athletic</td><td style="padding:8px; border:1px solid #e5e7eb;">Explosive & Functional</td></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Day 6-7</td><td style="padding:8px; border:1px solid #e5e7eb;">REST</td><td style="padding:8px; border:1px solid #e5e7eb;">Full Recovery</td></tr>
</table>

<h3>Week 2 - Oxygen Emphasis (Glycolytic)</h3>
<table style="width:100%; border-collapse: collapse; margin: 16px 0;">
<tr style="background:#f3f4f6;"><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Day</th><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Focus</th><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Emphasis</th></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Day 1</td><td style="padding:8px; border:1px solid #e5e7eb;">Push</td><td style="padding:8px; border:1px solid #e5e7eb;">Glycolytic - Supersets 20-30 reps</td></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Day 2</td><td style="padding:8px; border:1px solid #e5e7eb;">Pull</td><td style="padding:8px; border:1px solid #e5e7eb;">Glycolytic - Supersets 20-30 reps</td></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Day 3</td><td style="padding:8px; border:1px solid #e5e7eb;">Mobility</td><td style="padding:8px; border:1px solid #e5e7eb;">Recovery & Movement Quality</td></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Day 4</td><td style="padding:8px; border:1px solid #e5e7eb;">Legs</td><td style="padding:8px; border:1px solid #e5e7eb;">Glycolytic - Supersets 20-30 reps</td></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Day 5</td><td style="padding:8px; border:1px solid #e5e7eb;">Athletic</td><td style="padding:8px; border:1px solid #e5e7eb;">Explosive & Functional</td></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Day 6</td><td style="padding:8px; border:1px solid #e5e7eb;">Mobility</td><td style="padding:8px; border:1px solid #e5e7eb;">Recovery & Movement Quality</td></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Day 7</td><td style="padding:8px; border:1px solid #e5e7eb;">REST</td><td style="padding:8px; border:1px solid #e5e7eb;">Full Recovery</td></tr>
</table>

<h3>Universal Training Principles</h3>
<ul>
<li>Every set to <strong>mechanical failure</strong> (cannot complete another rep with good form - NOT true failure)</li>
<li>Always perform <strong>full range of motion</strong> unless specifically noted</li>
<li>Counting <strong>DIRECT working volume</strong> only (not indirect)</li>
<li>Goal: <strong>progressive tension overload</strong> with undulating volume</li>
<li>Tempo: <strong>slow and controlled</strong> unless specifically noted</li>
<li>Rest periods: <strong>60-90s max</strong></li>
<li>Prioritize <strong>nasal breathing</strong> throughout all training</li>
</ul>`,

    warmup_cooldown: `<h2>Warm Up - Movement Prep</h2>
<p><em>Done before every training session to drive up preliminary VEGF movement and aerobic capacity</em></p>

<h3>Step 1: General Warm-Up</h3>
<p>Begin with roughly <strong>10 minutes of low intensity cardio</strong> to get your whole body moving and adapting to the workload you're about to impose on it.</p>

<h3>Step 2: Muscle Activation</h3>
<p>Focus on properly activating the target muscles for the day by taking your first exercise and doing the movement with a <strong>very low load</strong>. Establish your mind-to-muscle connection, focus on fully lengthening and shortening the intended muscle, and move through <strong>12-20 reps</strong> with a lot of intent. Do this with ONLY the thought of contracting that working muscle on your mind.</p>

<h3>Step 3: Working Warm-Up Sets</h3>
<p>After that working muscle is engaged enough and you can get a <strong>10/10 contraction</strong>, we know VEGF is where we want it, and you can begin your workout as per the program - these are your INITIAL warm up sets.</p>

<h3>Important Notes</h3>
<ul>
<li>Your first exercise will have a few warm up sets of only a few reps each to ensure you are adequately warmed up</li>
<li>After your first exercise, you do not need warm ups for other exercises, only a feeler set or two to find your working weight</li>
<li>Fully shortened position = muscle is fully contracted</li>
<li>Fully lengthened position = muscle is fully stretched</li>
</ul>

<hr/>

<h2>Cool Down</h2>
<p><em>Done at the end of every training session</em></p>

<h3>10-Minute Post-Workout Meditation Protocol</h3>
<p>The sympathetic nervous system directs the body's rapid involuntary response to dangerous or stressful situations. The parasympathetic nervous system conserves energy as it slows the heart rate, increases intestinal and gland activity, and relaxes sphincter muscles.</p>

<p>This meditation switches you from sympathetic to parasympathetic state, enhancing glucose management/partitioning/digestion, improving NO production, enhancing motor learning, and beginning all essential restoration-based cascades needed to optimize recovery immediately post-trauma.</p>

<h3>Protocol</h3>
<ol>
<li>Find a quiet place you can sit down</li>
<li>Sit down, take out your earbuds, and forget about everything</li>
<li>Begin breathing:
  <ul>
  <li>Inhale 2 sec, exhale 1 sec</li>
  <li>Inhale 2 sec, exhale 2 sec</li>
  <li>Inhale 2 sec, exhale 3 sec</li>
  <li>Inhale 2 sec, exhale 10 sec</li>
  <li>Then continue breathing normally - inhale and hold as deep as possible, push all air out before repeating</li>
  </ul>
</li>
</ol>`,

    energetic_systems: `<h2>Energetic System Work</h2>

<h3>Prolastic LISS (Higher HR, Taxing)</h3>
<p><strong>NONE UNTIL WE CAN REGAIN SOME OVERALL RESILIENCE</strong></p>

<h3>PBO Outdoor Walks (Lower HR, Relaxing)</h3>
<ul>
<li><strong>30 mins walking outside everyday</strong> at any time of the day (ideally split - half as the sun rises and half as the sun sets)</li>
<li>Whenever you get back from this walk, spend <strong>10 minutes grounding</strong> - feet bare in the grass, practicing basic gratitude for life and the world. Make this a POSITIVE time to clear your mind!</li>
<li>This pace should be very easy, relaxing - use this time to unwind</li>
<li>If weather is bad, do cardio indoors but keep the emphasis "slow, relaxing, and peaceful"</li>
<li><strong>Only nasal breathing</strong></li>
</ul>

<h3>Far End Spectrum Glycolysis HIIT</h3>
<p><strong>NONE UNTIL WE CAN REGAIN SOME OVERALL RESILIENCE</strong></p>`,

    nutrition: `<h2>Nutrition Protocol</h2>

<h3>Fluid Requirements</h3>
<p>Begin with consuming around <strong>1-1.5 gallon of water total per day</strong>. We will adjust based on feedback, sweat rates, etc. Our goal is to find where you PERSONALLY feel best.</p>

<h3>Electrolyte Requirements</h3>
<p>Make sure we are <strong>salting every meal</strong> and tracking where that salt intake lands. Ideally use some <strong>pink Himalayan sea salt with iodine</strong> or similar mineral dense salt.</p>

<h3>Initial Notes</h3>
<p>We are going to stick to counting total macros with some nutrient timing specifics and we're going to work to slowly add lean tissue and use calories to fuel our recovery!</p>

<hr/>

<h3>Training Day Macros</h3>
<table style="width:100%; border-collapse: collapse; margin: 16px 0;">
<tr style="background:#f3f4f6;"><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Macro</th><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Amount</th></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Protein</td><td style="padding:8px; border:1px solid #e5e7eb;"><strong>170g</strong></td></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Carbohydrates</td><td style="padding:8px; border:1px solid #e5e7eb;"><strong>200g</strong></td></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Fats</td><td style="padding:8px; border:1px solid #e5e7eb;"><strong>60g</strong></td></tr>
</table>
<p><strong>Guidelines:</strong> Eat every 3-5 hours with decent protein at each meal. Stick majority of carbs pre/intra/post workout. Heavier fatty meals at non-exercise periods. 90%+ from whole, micronutrient-dense food sources.</p>

<h3>Intra-Workout</h3>
<ul>
<li>1 scoop/12g RAW EAAs (anti-catabolic, recovery, drive up blood amino acid values)</li>
<li>2 scoops RAW FUEL/50g Carbs (supply glucose:fructose 1:8 ratio to blunt excessive negative norepinephrine cascades)</li>
<li>10g Creatine Monohydrate (drive glucose metabolism, facilitate hydration)</li>
<li>1 packet CBUM Hydration (drive proper cellular communication)</li>
</ul>

<h3>Post-Workout</h3>
<ul>
<li>50g RAW Whey Protein Isolate</li>
<li>75g carbohydrates minimum (split complex + simple sources)</li>
</ul>

<hr/>

<h3>Rest Day Macros</h3>
<table style="width:100%; border-collapse: collapse; margin: 16px 0;">
<tr style="background:#f3f4f6;"><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Macro</th><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Amount</th></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Protein</td><td style="padding:8px; border:1px solid #e5e7eb;"><strong>170g</strong></td></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Carbohydrates</td><td style="padding:8px; border:1px solid #e5e7eb;"><strong>100g</strong></td></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Fats</td><td style="padding:8px; border:1px solid #e5e7eb;"><strong>90g</strong></td></tr>
</table>
<p><strong>Guidelines:</strong> Eat every 2-5 hours. Protein at every meal. Carbs earlier in the day, fats later.</p>

<hr/>

<h3>Refeed Day Macros</h3>
<p><em>Utilized 1x per week on your hardest workout day</em></p>
<table style="width:100%; border-collapse: collapse; margin: 16px 0;">
<tr style="background:#f3f4f6;"><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Macro</th><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Amount</th></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Protein</td><td style="padding:8px; border:1px solid #e5e7eb;"><strong>170g</strong></td></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Carbohydrates</td><td style="padding:8px; border:1px solid #e5e7eb;"><strong>300-500g</strong> (depending on exertion)</td></tr>
<tr><td style="padding:8px; border:1px solid #e5e7eb;">Fats</td><td style="padding:8px; border:1px solid #e5e7eb;"><strong>60g</strong></td></tr>
</table>
<p><strong>Post-Workout (Refeed):</strong> 50g RAW Whey Protein Isolate + 100g carbohydrates minimum</p>

<h3>Universal Nutrition Rules</h3>
<ul>
<li>Encourage rotation and variety of proteins, fats, fruits, and vegetables</li>
<li>Do not eliminate foods - ensure majority is higher nutrient density</li>
<li>If any food or supplement compromises gut health, STOP immediately - when gut health goes, glucocorticoid production goes up and nutrient partitioning goes down</li>
</ul>`,

    neuroplastic_drills: `<h2>Daily Neuroplastic Work (AM Protocol)</h2>
<p><em>Complete every morning upon waking</em></p>

<h3>Step 1: Morning Mantra</h3>
<p>Repeat the mantra <strong>"Everything in life is an opportunity"</strong> 5x in your head before you even get out of bed.</p>

<h3>Step 2: Neuroplastic Supplements</h3>
<p>After brushing teeth, take:</p>
<ul>
<li><strong>600mg Tiger Milk Mushroom</strong> - acts as an NGF mimetic to create new better functioning neurons</li>
<li><strong>100mg DHEA</strong> - protects neurons against excitatory amino acid-induced neurotoxicity</li>
<li><strong>10mg Micronized Pregnenolone</strong> (sublingual - dissolve under tongue for 5-10 mins) - drives up BDNF, NGF, improves memory coding, enhances mood</li>
<li><strong>1g Redaxin</strong> - modulates CD38 to keep NAD cascades thriving, luteolinidin content pulls down neural inflammation</li>
</ul>

<h3>Step 3: Red Light Therapy</h3>
<p>Set up a red light therapy and NIR unit pointed at the side of your body a few feet away.</p>

<h3>Step 4: Speech & Broca's Area Activation</h3>
<p>Pick a word with many syllables and repeat it out loud <strong>15x</strong>, slowly increasing speed. Chemical names work great (e.g., "N-Phenylacetyl-L-prolylglycine ethyl ester"). This turns on your Broca's area, Wernicke's Area, and Articular cingulate to improve speech and communication.</p>

<h3>Step 5: Cursive Writing</h3>
<p>Get a notebook and, <strong>writing in cursive</strong>, write down three sentences about where you want to take your day and what you are thankful for. Cursive writing improves both hemispheres of your brain for better information processing.</p>

<h3>Step 6: Brain Games</h3>
<p>Play the <strong>Daily 5 games on the Elevate App</strong> followed by the crossword puzzle and word bend games.</p>
<ul>
<li>Crosswords: matures your PFC, improves decision making and pattern recognition</li>
<li>Word Bend: improves logical/problem solving skills and processing speeds</li>
</ul>

<h3>Step 7: Language Learning</h3>
<p>Learn <strong>1 new word in another language</strong>. Say the word in that language and then the English word - repeat 10x with eyes closed. The next day, try to remember it before looking it up. Being bilingual increases gray and white matter density.</p>

<h3>Step 8: Vocabulary</h3>
<p>Go to <strong>Merriam Webster's dictionary online</strong> and learn the word of the day. The bigger your vocabulary, the better you can process information.</p>

<h3>Step 9: Novel Skill Learning (4-Week Rotations)</h3>
<p>Learning new novel skills delays/stops synaptic pruning and retains new neurons:</p>
<ul>
<li><strong>Month 1:</strong> Juggling for 5 minutes</li>
<li><strong>Month 2:</strong> Moonwalk for 5 minutes</li>
<li><strong>Month 3:</strong> Solve a Rubik's Cube for 5 minutes</li>
</ul>
<p>Now you are ready to begin your day with the proper neurochemistry!</p>`,

    supplementation: `<h2>Baseline OTC Supplementation</h2>
<p><em>These are baseline long-term players</em></p>

<h3>With First Meal of the Day</h3>
<ul>
<li><strong>Infini-B Vitamin Complex:</strong> 1 cap AM - supply b-vitamin cascade and ensure no methylation issues occur</li>
<li><strong>Liver Support:</strong> 1 serving AM - modulate hepatic stress via reducing inflammation, upregulate immune system's actions on hepatic tissue, increase stem cell hepatic generation, and drive global immune health</li>
<li><strong>Kidney Support:</strong> 1 serving AM - drive positive mRNA synthesis of renal tissue</li>
</ul>

<p><em>Note: Reference supplements section for product links. Additional supplements may be added based on bloodwork results and individual response.</em></p>`,

    emf_quantum: `<h2>Electromagnetic Field & Quantum Work</h2>

<h3>Aires Tech Lifetune Flex</h3>
<p>Wear daily and then at night put next to your nightstand by your bedside. This knocks out non-native magnetic fields that can keep your cells in a sympathetically driven state and alter neurochemistry, preventing your brain from getting truly parasympathetic for recovery.</p>

<h3>Bioshield Pillowcase</h3>
<p>Replace your normal pillow case with this grounded pillow case for additional electron donation while you sleep. This potentiates positive alterations in magnetic exposure from EMF products. <em>Only use grounding products if using something to improve longitudinal wave forms and not transverse.</em></p>

<h3>Quantum Upgrade</h3>
<p>Purchase the subscription for your household and input your address with all pertinent information. This covers global frequency and reduction in localized magnetism and electric-based issues.</p>
<ul>
<li>Set the <strong>daytime to the highest level</strong></li>
<li><strong>Turn OFF the nighttime frequency initially</strong></li>
<li>Once you adapt, add nighttime at the lowest level</li>
<li><em>If you do it too soon you will literally not be able to sleep</em></li>
</ul>`,

    lifestyle_circadian: `<h2>Lifestyle & Circadian Protocols</h2>

<h3>Breathing</h3>
<p>We want to be <strong>nasal breathing the majority of our day</strong> and only breathing through our mouth during extremely high exertion actions.</p>
<p>The nose is the main portion of our body designed for breathing - it allows us to bring in the distal lower portion of our lungs for more efficient tissue oxygenation. Nasal breathing drives greater diffusion for greater vasodilation. During rest, this lowers HR and increases bodyfat use for fuel through parasympathetic beta-oxidation. During exercise, this alters cellular pH fluxing to stimulate anabolic activity and manage O2/CO2 levels better.</p>
<p>If we master nasal breathing, everything from health to body composition to performance to quality of life WILL improve dramatically.</p>

<h3>Sun Exposure</h3>
<p>Achieve roughly <strong>10-20 minutes of outdoor sun exposure daily</strong> to allow the photonic exchange from the sun to traverse skin, bone, mitochondria, etc. This improves mitochondrial function and number, manages carbons better, and supports proper drug dynamics.</p>
<p>Every little bit helps and it has a very high return on time invested - and it's FREE!</p>

<hr/>

<h3>Basic Circadian Daily Work</h3>

<h4>AM - How to Start Your Days</h4>
<ol>
<li><strong>Deep belly breathing</strong> - do not think about anything but your breathing. Control your ventilation to shift into a proper parasympathetic state with better resting heart rate. Breathe until you feel ready to start the day.</li>
<li><strong>Go outside for 5+ mins</strong> to be exposed to the photonic exchange of the sun. This recognizes start/stop signaling through the SCN to re-establish proper circadian clock genes.</li>
<li>Do this after your neuroplastic work.</li>
</ol>

<h4>PM - How to End Your Days</h4>
<ol>
<li><strong>Go outside for 5+ mins</strong> to be exposed to different wavelengths of the moon. Stare at it and allow your body to recognize start/stop signaling through the SCN.</li>
<li><strong>Vagus nerve manual work</strong> once laying in bed to get as parasympathetic as possible.</li>
<li>Find the little ridge above your ear canal and gently make small circles (very light pressure). Do this until you feel a sigh of relief confirming PNS activity. Repeat on the other side.</li>
</ol>`,

    mentality: `<h2>Overall Mentality - Mantras & Positive Thinking</h2>
<p>These are basic mantras and positive thinking protocols to help build a stronger mental framework.</p>

<h3>When Feeling OVERWHELMED</h3>
<ol>
<li>Breathe, stop what you're doing, close your eyes</li>
<li>See in your mind's eye in big red letters surrounded by black: <strong>"Life is on my own schedule."</strong></li>
<li>See those words for a few seconds, breathe, open your eyes</li>
<li>List your priorities in order, then start them one at a time</li>
<li>DO NOT think about how many things you have to do - simply get one thing done at a time</li>
</ol>

<h3>When OVERTHINKING</h3>
<ol>
<li>Close your eyes, take a deep breath</li>
<li>Imagine a big metal power shut off switch like in the movies at electrical plants</li>
<li>Flip that switch down - all the things you're overthinking get turned off</li>
<li>Repeat the mantra: <strong>"No more overthinking"</strong></li>
<li>Open your eyes and FORCE yourself to think about anything else</li>
<li>Over time this will kill overthinking!</li>
</ol>

<h3>When Feeling ANGER for No Reason</h3>
<ol>
<li>Stop what you're doing immediately. Breathe.</li>
<li>Ask yourself: is this really something that should be upsetting me?</li>
<li>The answer 9 times out of 10 is no - it's something small</li>
<li>Breathe, smile, and continue with something POSITIVE</li>
</ol>

<h3>When ANXIETY/NEGATIVE THOUGHTS Occur</h3>
<p>Begin viewing the positives in everything in life because they are there if you look hard enough. Being positive about everything is a <strong>choice</strong>, it does not just happen by chance.</p>
<ul>
<li>Instead of getting mad over a vandalized car, see it as an opportunity to not lose your temper</li>
<li>Instead of getting mad over getting fired, view it as an opportunity to become better or find a field you enjoy</li>
<li>ANYTHING in life can be turned into a positive</li>
</ul>
<p>The power to always be positive is a <strong>LEARNED SKILL</strong> - and it becomes easier over time.</p>
<p>Remember the mantra: <strong>"I will be the light that will shine the brightest, when the world is the darkest"</strong> - say that with CONFIDENCE AND SMILE!</p>`
  }
};

// ============================================================
// INSERT ALL TEMPLATES
// ============================================================

try {
  // 1. Periodization template
  await conn.execute(
    'INSERT INTO protocol_section_templates (name, sectionType, content) VALUES (?, ?, ?)',
    ['Omega Elite Default - Periodization', 'periodization', JSON.stringify(periodizationContent)]
  );
  console.log('✅ Periodization template inserted');

  // 2. Training Split template
  await conn.execute(
    'INSERT INTO protocol_section_templates (name, sectionType, content) VALUES (?, ?, ?)',
    ['Omega Elite Default - Training Split', 'training_split', JSON.stringify(trainingSplitContent)]
  );
  console.log('✅ Training Split template inserted');

  // 3. Program Guide template
  await conn.execute(
    'INSERT INTO protocol_section_templates (name, sectionType, content) VALUES (?, ?, ?)',
    ['Omega Elite Default - Program Guide', 'program_guide', JSON.stringify(programGuideContent)]
  );
  console.log('✅ Program Guide template inserted');

  console.log('\n🎉 All 3 master templates inserted successfully!');
  console.log('You can now go to any client → Protocol Items → Protocol Sections → Load Template');
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await conn.end();
}

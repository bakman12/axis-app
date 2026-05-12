import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { entities } from '@/lib/encryptedBase44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Sparkles, Heart, Settings, AlertTriangle, Smile } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import MessageBubble from '../components/MessageBubble';
import RootPageHeader from '../components/RootPageHeader';
import VoiceInput from '../components/VoiceInput';
import HealthProfileSetup from '../components/HealthProfileSetup';
import SavedWorkoutsPanel from '../components/SavedWorkoutsPanel';
import SavedRecipesPanel from '../components/SavedRecipesPanel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const CONV_KEY = 'axis_coach_messages';
function loadMessages() { try { return JSON.parse(localStorage.getItem(CONV_KEY) ?? '[]'); } catch { return []; } }
function saveMessages(msgs) { try { localStorage.setItem(CONV_KEY, JSON.stringify(msgs.slice(-200))); } catch {} }

// Per-session counters — each new request in a category advances to the next item
const counters = { gentle: 0, moderate: 0, high: 0, recipe: 0 };
let lastCategory = null;

function pick(arr, key) {
  const item = arr[counters[key] % arr.length];
  counters[key]++;
  return item;
}

// ─── WORKOUTS ────────────────────────────────────────────────────────────────

const GENTLE_WORKOUTS = [
  `## 🧘 Gentle Recovery Workout (20 min)

*Perfect for low-energy days. Honour your body and move at your own pace.*

---

### Warm-Up — 5 minutes

**1. Neck Rolls** *(1 min)*
- Sit upright in a chair or stand tall
- Slowly drop your right ear toward your right shoulder
- Roll your chin down to your chest, then up to the left shoulder
- Complete **5 slow circles each direction**, breathing throughout

**2. Shoulder Rolls** *(1 min)*
- Let arms hang at your sides
- Roll both shoulders forward **10 times**, drawing large circles
- Reverse and roll **10 times backward**
- Keep your jaw relaxed

**3. Gentle March on the Spot** *(3 min)*
- Lift alternate knees to about hip height
- Swing arms loosely in rhythm
- Aim for a very relaxed, unhurried pace — just enough to warm the body

---

### Main Session — 10 minutes

**Exercise 1 — Wall Push-Ups** · 3 sets × 10 reps · Rest 30 sec
1. Stand facing a wall, arm's length away
2. Place both palms flat on the wall at chest height, shoulder-width apart
3. Bend your elbows and bring your chest toward the wall slowly
4. Push back to the starting position — squeeze your chest at the top
5. Keep your body in a straight line throughout — don't let hips sag

**Exercise 2 — Seated Leg Raises** · 3 sets × 10 reps each leg · Rest 30 sec
1. Sit upright near the edge of a sturdy chair, feet flat on the floor
2. Straighten your right leg until it is parallel to the floor
3. Hold for **2 full seconds** — feel the quad engage
4. Lower your leg slowly, stopping just before your foot touches the floor
5. Complete all 10 reps on one leg, then switch

**Exercise 3 — Standing Calf Raises** · 2 sets × 15 reps · Rest 20 sec
1. Stand behind a chair, lightly holding the back for balance
2. Rise up onto the balls of both feet as high as you comfortably can
3. Pause at the top for **1 second**
4. Lower back down slowly — resist on the way down for best results

---

### Cool-Down — 5 minutes

**Quad Stretch** *(30 sec each side)*
- Stand on one leg, hold the opposite ankle behind you
- Keep both knees together and stand tall
- Breathe deeply; if you feel a gentle pull in the front of the thigh, you're in the right position

**Chest Opener** *(30 sec × 2)*
- Clasp hands behind your back, palms pressing together
- Gently squeeze shoulder blades and lift your chest
- Hold 20 seconds, then release and repeat

**Deep Breathing** *(2 min)*
- Sit or lie down in a comfortable position
- Inhale through the nose for **4 counts**
- Hold for **4 counts**
- Exhale slowly through the mouth for **6 counts**
- Repeat 6 times — let each exhale release tension

---
💊 *If any medication causes dizziness when standing, rise slowly from seated positions and hold onto something stable.*`,

  `## 🌿 10-Minute Stretch & Breathe Routine

*No equipment needed. Ideal for tired or difficult days.*

---

### Full Routine — do each movement once, in order

**1. Standing Cat-Cow** *(1 min)*
1. Stand with feet hip-width apart, hands on thighs, slight bend in knees
2. Inhale — arch your back, stick your chest out, look slightly up
3. Exhale — round your back, tuck your chin, pull your belly in
4. Flow slowly between the two, matching breath to movement
5. Complete **8 full cycles**

**2. Side Reaches** *(1 min)*
1. Stand tall, feet hip-width apart
2. Raise your right arm overhead and lean gently to the left
3. Hold for **3 breaths**, feeling the stretch along your right side
4. Return to centre and repeat on the other side
5. Complete **4 reaches each side**

**3. Seated Spinal Twist** *(2 min)*
1. Sit upright on a chair, feet flat on the floor
2. Place your right hand on your left knee
3. Gently rotate your torso to the left, looking over your left shoulder
4. Hold for **5 slow breaths** — grow taller with each inhale
5. Return to centre and repeat on the other side

**4. Standing Hip Circles** *(1 min)*
1. Stand with feet shoulder-width apart, hands on hips
2. Move your hips in the largest circle you can manage
3. Complete **8 clockwise circles**, then **8 counter-clockwise**
4. Keep your upper body relatively still — just the hips

**5. Wall Chest Stretch** *(1 min)*
1. Stand beside a wall, arm's length away
2. Place your right palm flat against the wall at shoulder height
3. Slowly rotate your body away from the wall until you feel a stretch across your chest and shoulder
4. Hold **30 seconds**, breathe steadily, then switch sides

**6. Calf & Ankle Rolls** *(1 min)*
1. Sit in a chair
2. Lift your right foot off the floor
3. Draw large, slow circles with your foot — **10 clockwise, 10 counter-clockwise**
4. Point your toes down to stretch the calf, then flex upward
5. Switch feet

**7. Seated Forward Fold** *(2 min)*
1. Sit on the edge of a chair
2. Open feet a little wider than hip-width
3. Hinge forward from the hips, letting your arms and head hang toward the floor
4. Breathe slowly and let gravity do the work — don't force it
5. Stay here for **1–2 minutes**

**8. Final Breath** *(1 min)*
- Sit or stand comfortably
- Place one hand on your chest, one on your belly
- Take 5 deep belly breaths — the lower hand should rise first
- On the last exhale, let out a long, audible sigh

---
💊 *This routine is safe with most medications. If you have joint pain, skip any movement that causes discomfort and stay within a comfortable range.*`,
];

const MODERATE_WORKOUTS = [
  `## 🏃 Full-Body Circuit Workout (30 min)

*A balanced session combining cardio and strength — no equipment needed.*

---

### Warm-Up — 5 minutes

**1. Marching on the Spot** *(1 min)*
- Lift knees to hip height, swinging arms in rhythm
- Gradually increase pace over the minute

**2. Arm Circles** *(1 min)*
- Extend arms out to the sides
- Make small circles forward for **20 seconds**, then large circles for **20 seconds**
- Reverse direction for the last **20 seconds**

**3. Hip Swings** *(1 min)*
- Stand beside a wall, lightly touching it for balance
- Swing your right leg forward and back in a controlled arc
- **10 swings**, then turn and repeat with the left leg

**4. Bodyweight Squats (slow)** *(2 min — warm-up pace)*
- Feet shoulder-width apart, toes slightly turned out
- Lower slowly over **3 counts**, pause at the bottom, rise over **2 counts**
- Complete **10 slow warm-up squats**

---

### Circuit — 3 rounds · Rest 60 sec between rounds

*Complete all exercises back-to-back, then rest before the next round.*

**1. Squats** · 15 reps
1. Stand with feet shoulder-width apart, toes slightly out
2. Push your hips back as if sitting into a chair
3. Lower until thighs are parallel to the floor (or as low as comfortable)
4. Drive through your heels to stand — squeeze glutes at the top
5. Keep your chest up and knees tracking over toes throughout

**2. Push-Ups** · 10 reps *(drop to knees if needed)*
1. Start in a plank: hands slightly wider than shoulders, body in a straight line
2. Lower your chest toward the floor over **2 counts**
3. Push back up explosively over **1 count**
4. At the top, fully extend arms but don't lock elbows
5. *Modification:* Same movement but with knees on the floor

**3. Reverse Lunges** · 10 reps each leg
1. Stand tall, feet together
2. Step your right foot **back** about 60–70cm
3. Lower your back knee toward the floor — stop about 2–3cm above it
4. Front thigh should be roughly parallel to the floor
5. Drive through your front heel to return to standing
6. Alternate legs for each rep

**4. Plank Hold** · 30 seconds
1. Rest on forearms and toes — elbows directly under shoulders
2. Squeeze your abs, glutes, and thighs — create full-body tension
3. Keep hips level — don't let them sag or pike upward
4. Breathe normally throughout
5. *Easier option:* Drop to knees

**5. Glute Bridges** · 15 reps
1. Lie on your back, knees bent, feet flat hip-width apart
2. Press through your heels and lift your hips off the floor
3. At the top, your body should form a straight line from knees to shoulders
4. Squeeze glutes hard for **1 full second**
5. Lower slowly — don't let your bottom touch the floor between reps

---

### Cool-Down — 5 minutes

**Standing Quad Stretch** *(30 sec each)*
- Balance on one leg, hold the opposite ankle behind you
- Keep knees together — the stretch should be felt in the front of the thigh

**Lying Hamstring Stretch** *(45 sec each)*
- Lie on your back, loop a towel or belt around one foot
- Straighten the leg toward the ceiling as far as comfortable
- Hold steady; breathe into the stretch

**Child's Pose** *(1 min)*
- Kneel, big toes together, knees wide
- Extend arms forward on the floor, sink your chest down
- Breathe slowly and let your lower back fully release

---
💊 *Stay well hydrated before, during, and after exercise. If taking diuretics, you may need extra fluids.*`,

  `## 🚴 Cardio + Core Workout (30 min)

*Focus on building cardiovascular fitness and a strong core.*

---

### Warm-Up — 5 minutes

**Jumping Jacks** *(2 min)*
1. Start standing, feet together, arms at sides
2. Jump feet out wide while raising arms overhead — clap hands above your head
3. Jump back to starting position
4. Build up speed gradually over the 2 minutes

**Torso Twists** *(1 min)*
1. Stand with feet shoulder-width apart, arms extended straight out
2. Rotate your upper body left, then right in a controlled arc
3. Keep hips facing forward — the rotation comes from the waist
4. Complete **20 total twists**

**Leg Swings (side to side)** *(1 min)*
1. Face a wall and lightly rest hands on it
2. Swing your right leg out to the right, then across your body to the left
3. **10 swings per leg** — keep the swinging leg relatively straight

**High Knees** *(1 min)*
1. Run on the spot, bringing knees up to hip height
2. Drive your arms in rhythm with your legs
3. Aim for a challenging but sustainable pace

---

### Cardio Intervals — 15 minutes

*Alternate between 40 seconds of work and 20 seconds of rest for each exercise.*

**Round 1**
- **Step Touches** (40 sec) — step right, tap left foot, step left, tap right; swing arms across body
- Rest 20 sec
- **Mountain Climbers** (40 sec) — plank position, drive knees to chest alternately as fast as you can
- Rest 20 sec

**Round 2**
- **Squat Jumps** (40 sec) — squat down, then explode upward; land softly, immediately lower back into the squat
- Rest 20 sec
- **Skaters** (40 sec) — leap sideways onto one foot, touch the floor with the opposite hand, leap to the other side
- Rest 20 sec

**Round 3**
- **Burpees (no jump)** (40 sec):
  1. Stand tall
  2. Place hands on floor in front of feet
  3. Jump or step feet back to a plank
  4. Jump or step feet back to hands
  5. Stand back up — that's one rep
- Rest 20 sec
- **High Knees (full speed)** (40 sec)
- Rest 20 sec

---

### Core Block — 8 minutes

**Dead Bug** · 3 sets × 10 reps
1. Lie on your back, arms straight up toward the ceiling, knees bent at 90° in the air
2. Slowly lower your **right arm** overhead while simultaneously extending your **left leg** toward the floor
3. Lower as far as you can without your lower back leaving the floor
4. Return to start — that is **1 rep**
5. Alternate sides
6. Move slowly and deliberately — this is about control, not speed

**Russian Twists** · 3 sets × 20 reps (10 each side)
1. Sit on the floor, knees bent, feet flat or raised slightly (harder)
2. Lean back slightly until you feel your abs working — don't slump
3. Clasp hands together in front of your chest
4. Rotate your torso right, bringing hands toward the floor beside your hip
5. Return to centre, then rotate left — that is 2 reps
6. Add weight (a water bottle or tin) to increase difficulty

**Hollow Body Hold** · 3 sets × 20 seconds
1. Lie on your back, arms extended overhead, legs straight
2. Lift your arms, head, and legs off the floor simultaneously
3. Press your lower back firmly into the floor — no gap
4. Keep legs as low as possible while maintaining contact with the floor
5. Breathe throughout — do not hold your breath

---

### Cool-Down — 2 minutes

**Supine Twist** *(30 sec each side)*
- Lie on your back, pull your right knee to your chest
- Let it fall across your body to the left while your right arm extends out to the right
- Look toward your right hand; breathe into the rotation

**Lying Child's Pose** *(1 min)*
- Lie face down, arms extended overhead, rest forehead on the floor
- Take 5 deep breaths, letting your belly soften into the floor

---
💊 *High-intensity intervals can raise heart rate significantly. If you take beta-blockers, your maximum heart rate will be lower than average — the "perceived effort" scale is more useful than pulse targets.*`,
];

const HIGH_ENERGY_WORKOUTS = [
  `## 💪 Strength Builder Workout (40 min)

*A progressive session designed to build real strength over time.*

---

### Warm-Up — 8 minutes

**Foam Roller / Self-Massage (optional)** *(2 min)*
- Roll slowly along your thighs, calves, and upper back
- Pause on any tender spots for 10–15 seconds

**Dynamic Stretches** *(3 min)*
1. **Leg swings forward/back** — 10 per leg
2. **Hip circles** — 10 each direction
3. **Inch worms**: stand, hinge forward, walk hands out to plank, walk hands back, stand — 5 reps
4. **Arm circles** — 20 forward, 20 backward

**Activation Sets** *(3 min)*
- **Bodyweight squats** × 15 (slow, controlled)
- **Hip thrusts** × 15 (glute activation)
- **Band pull-aparts** × 15 (or reverse arm swings)

---

### Lower Body — 4 sets each exercise · Rest 60–90 sec

**1. Goblet Squat** *(or standard bodyweight squat)*  · 4 × 12
1. Stand with feet slightly wider than shoulder-width, toes at 45°
2. Hold a weight at chest height (dumbbell, kettlebell, or heavy water bottle)
3. Push hips back and down, keeping your chest upright and elbows inside your knees
4. Descend until hips are **below parallel** if mobility allows
5. Drive through the full foot to stand, squeeze glutes at the top

**2. Romanian Deadlift** *(use any weight, or bodyweight)* · 4 × 10
1. Stand tall, feet hip-width apart, slight bend in knees
2. Push hips back while hinging forward — your back stays completely flat
3. Lower the weight along your legs until you feel a strong hamstring stretch
4. Drive hips forward to return to standing — do not round your back
5. Think: "hips back" on the way down, "hips forward" on the way up

**3. Bulgarian Split Squat** *(use a chair)* · 3 × 10 each leg
1. Stand about 60–70cm in front of a chair
2. Place your back foot on the seat — toes pointing down
3. Lower your back knee straight down toward the floor
4. Front shin should stay nearly vertical
5. Press through your front heel to return — keep your torso upright
6. Complete all reps on one leg before switching

---

### Upper Body — 3 sets each exercise · Rest 60 sec

**4. Push-Up Progression** · 3 × 12
1. Place hands slightly wider than shoulders; fingers pointing forward
2. Lower chest to 1–2cm above the floor — elbows at about 45° from torso
3. Push explosively back to start
4. Add a **3-second descent** to make each rep more challenging
5. *Progression:* elevate feet on a chair for decline push-ups

**5. Inverted Row** *(under a sturdy table)* · 3 × 10
1. Lie under a table, gripping the edge with palms facing you
2. Body should be in a straight line from head to heels (feet on floor)
3. Pull your chest up toward the table edge, squeezing shoulder blades together
4. Lower with control — 2–3 seconds on the way down
5. *Easier:* bend your knees and keep feet flat on the floor

**6. Dips** *(on a sturdy chair)* · 3 × 12
1. Grip the front edge of the seat, slide your bottom off the chair
2. Walk feet forward — the further away, the harder
3. Bend elbows directly behind you (not out to the sides) to lower yourself
4. Push back up to full extension — squeeze triceps at the top

---

### Finisher *(optional — only if you still have fuel)*

**100 Rep Challenge:** Complete 100 reps of any one exercise broken into however many sets you need
- Options: bodyweight squats, push-ups, or jumping jacks
- Rest as needed between sets — finish all 100 before moving on

---

### Cool-Down — 7 minutes

**Pigeon Pose** *(1 min each side)*
- From a lunge, bring your front shin across your body at an angle
- Lower your chest toward the floor for a deep hip stretch

**Doorway Chest Stretch** *(45 sec × 2)*
- Place forearms on a doorframe, lean your chest through gently

**Foam Roll Upper Back** *(2 min)*
- Place roller horizontally across your mid-back; support your head
- Extend over the roller and pause on any stiff spots

---
💊 *Strength training is generally safe with most medications. Avoid exercising to complete exhaustion — finish feeling challenged, not depleted. Always consult your doctor if you've recently changed medications.*`,
];

// ─── RECIPES ─────────────────────────────────────────────────────────────────

const RECIPES = [
  `## 🍋 Lemon Herb Baked Salmon Bowl (20 min)

**Serves:** 1 · **Prep:** 5 min · **Cook:** 15 min · **~480 kcal**

---

### Ingredients

**Protein**
- 1 salmon fillet (150g) — or 1 tin of salmon in spring water, drained
- ½ lemon, zested and juiced
- 1 tsp olive oil · Salt, black pepper, garlic powder

**Base**
- 80g brown rice (or 1 microwave pouch — saves 12 minutes)
- OR 80g quinoa

**Vegetables**
- 1 cup broccoli florets
- 1 medium courgette, sliced into half-moons (about 1cm thick)
- Handful of cherry tomatoes, halved

**To serve**
- 1 tbsp tahini or hummus (optional)
- Fresh parsley or coriander
- Extra lemon wedge

---

### Step-by-Step Instructions

**Step 1 — Cook the rice** *(3 min active / 15 min total)*
1. Rinse 80g brown rice under cold water for 30 seconds
2. Add to a small saucepan with 200ml cold water and a pinch of salt
3. Bring to a boil over high heat, then immediately reduce to the lowest simmer
4. Put the lid on — **do not lift it** — and cook for **12–15 minutes**
5. After 12 minutes, check: if water is absorbed and rice is tender, remove from heat
6. Let it sit covered for 2 more minutes, then fluff with a fork

**Step 2 — Prep the vegetables** *(3 min)*
1. Cut the broccoli into small, even-sized florets (smaller = crispier)
2. Slice the courgette into half-moon shapes about 1cm thick
3. Halve the cherry tomatoes and set aside — these go in raw at the end

**Step 3 — Roast the vegetables** *(12 min)*
1. Preheat oven to **200°C / 180°C fan / Gas 6** (or air fryer at 190°C)
2. Toss broccoli and courgette in 1 tsp olive oil, salt, and pepper
3. Spread in a **single layer** on a baking tray — crowding causes steaming, not roasting
4. Roast **12–15 minutes** until edges are slightly golden and broccoli tips are crispy

**Step 4 — Season and cook the salmon** *(7 min)*
1. Pat the salmon dry with kitchen paper — dry fish sears better
2. Sprinkle both sides with salt, pepper, garlic powder, and lemon zest
3. Heat a non-stick frying pan over **medium-high heat** — it should feel hot before the fish goes in
4. Add 1 tsp oil, then place salmon **skin-side down**
5. Cook **3–4 minutes without moving it** — the sides should look opaque halfway up
6. Flip and cook **2 more minutes** — salmon is done when it flakes easily with a fork
7. Squeeze half the lemon over the fish

**Step 5 — Assemble the bowl**
1. Spoon rice into your bowl
2. Arrange roasted veg alongside
3. Place salmon on top (skin-side down so it stays crispy)
4. Scatter the raw cherry tomatoes around
5. Drizzle tahini or hummus if using
6. Squeeze remaining lemon over everything
7. Finish with a handful of fresh herbs

---

### Tips

🥶 **Meal prep:** Double the recipe — keeps in the fridge for 3 days. Reheat veg and rice; eat salmon cold or at room temp
⏩ **Quickest version:** Microwave rice pouch (2 min) + tinned salmon = 8 minutes total
🔄 **Swaps:** Replace salmon with chicken thighs (cook 6 min each side), tofu (press first, cook 4 min each side), or prawns (2–3 min total)
💊 **Note:** Oily fish supports heart and brain health. If you're on warfarin, maintain consistent omega-3 intake rather than varying it day to day

---

**Macros (approx):** 38g protein · 45g carbs · 15g fat`,

  `## 🍳 High-Protein Egg & Veggie Scramble (12 min)

**Serves:** 1 · **Prep:** 3 min · **Cook:** 9 min · **~380 kcal**

---

### Ingredients

- 3 large eggs
- 2 tbsp milk (any type)
- 1 tsp butter or olive oil
- ½ red or yellow bell pepper, diced small
- ½ cup baby spinach (a large handful)
- 4 cherry tomatoes, halved
- 2 spring onions (scallions), thinly sliced
- 30g feta cheese (crumbled) or cheddar (grated) — optional
- Salt, black pepper, pinch of chilli flakes (optional)
- 2 slices wholegrain toast

---

### Step-by-Step Instructions

**Step 1 — Crack and whisk the eggs** *(2 min)*
1. Crack all 3 eggs into a bowl
2. Add 2 tbsp milk, a pinch of salt, black pepper, and chilli flakes if using
3. Whisk vigorously with a fork for about **30 seconds** until fully combined and slightly frothy
4. Small air bubbles = fluffier scramble

**Step 2 — Cook the vegetables** *(4 min)*
1. Put your non-stick pan on **medium heat** — a too-hot pan makes rubbery eggs
2. Add 1 tsp butter or oil and let it melt
3. Add the diced bell pepper — cook **2 minutes**, stirring occasionally, until slightly softened
4. Add the cherry tomatoes — cook **1 more minute**
5. Add the spring onions — toss for **30 seconds**

**Step 3 — Scramble the eggs** *(3 min)*
1. Pour the egg mixture over the vegetables in the pan
2. Leave untouched for **10 seconds** until the edges just start to set
3. Using a spatula, draw slow, large folds across the pan — **do not stir rapidly**
4. Every few seconds, fold rather than stir — you're creating large, creamy curds
5. When the eggs look **almost set but still slightly glossy**, remove from heat immediately
6. Residual heat will finish cooking them — they'll look perfect in 30 seconds

**Step 4 — Add the finishing touches**
1. Scatter baby spinach over the eggs and fold in — the heat will wilt it in 20 seconds
2. Crumble feta or scatter grated cheddar on top
3. Taste and adjust seasoning
4. Serve immediately on wholegrain toast

---

### Why Each Step Matters

- **Whisking with milk** traps air = fluffier eggs
- **Medium heat** prevents the proteins from seizing = creamier texture
- **Large folds, not stirring** = soft, restaurant-style curds
- **Off the heat early** = the eggs carry-over cook to perfect without going rubbery

---

### Variations

🌮 **Wrap version:** Serve in a warmed wholegrain wrap with a spoonful of salsa
🥑 **Boost the fat:** Add ¼ avocado sliced on the side
🍄 **Add mushrooms:** Sauté 4 sliced mushrooms for 3 minutes before adding the pepper
💊 **Note:** Eggs are one of the most bioavailable protein sources. They don't significantly affect medication absorption — safe to eat with most morning medications

---

**Macros (approx):** 28g protein · 32g carbs · 18g fat`,

  `## 🍜 15-Minute Chicken & Ginger Noodle Soup

**Serves:** 1 · **Prep:** 3 min · **Cook:** 12 min · **~420 kcal**

---

### Ingredients

- 1 chicken breast (150g), thinly sliced — or use leftover cooked chicken, shredded
- 1 nest of rice noodles (about 80g dry)
- 500ml low-salt chicken or vegetable stock
- 2cm piece of fresh ginger, peeled and grated (or ¼ tsp ground ginger)
- 2 cloves garlic, minced (or ½ tsp garlic powder)
- 1 tbsp low-sodium soy sauce or tamari
- 1 tsp sesame oil
- 1 large handful baby spinach or pak choi
- 2 spring onions, sliced
- 1 tsp chilli paste or a pinch of chilli flakes (optional)
- Fresh coriander to serve (optional)

---

### Step-by-Step Instructions

**Step 1 — Prepare the ingredients** *(3 min)*
1. Thinly slice the chicken breast — the thinner the slices (about 5mm), the faster they cook
2. Grate the ginger using the smallest hole on a box grater or a microplane
3. Mince the garlic or use a garlic press
4. Slice the spring onions diagonally — this is purely aesthetic but looks great
5. Place rice noodles in a bowl and cover with just-boiled water; set aside

**Step 2 — Build the broth base** *(3 min)*
1. Place a medium saucepan over **medium-high heat** — no oil needed
2. Add garlic and ginger directly to the dry pan for **30 seconds**, stirring constantly
3. You want them fragrant, not burnt — they'll sizzle and smell incredible
4. Pour in the 500ml stock and bring to a rolling boil
5. Add soy sauce and chilli paste/flakes if using — stir to combine

**Step 3 — Cook the chicken** *(4 min)*
1. Once the broth is boiling, add the sliced chicken in a single layer
2. Reduce heat to **medium** — a gentle simmer, not a rolling boil
3. Cook for **3–4 minutes**, stirring once halfway through
4. The chicken is done when no pink remains and slices are just firm to touch
5. *If using pre-cooked chicken:* skip this step and add it at Step 4

**Step 4 — Add noodles and greens** *(2 min)*
1. Drain the soaked rice noodles and add to the soup
2. Add the baby spinach or pak choi on top
3. Stir gently — the noodles will finish cooking in the hot broth in about **1 minute**
4. The greens will wilt in **30–60 seconds**

**Step 5 — Finish and serve**
1. Remove from heat
2. Stir in **1 tsp sesame oil** — this is added at the end to preserve its flavour
3. Taste and adjust salt/soy sauce
4. Ladle into a deep bowl
5. Top with spring onions and fresh coriander
6. Serve immediately

---

### Why This Soup is Great for Medication Days

- **Ginger** is a natural anti-nausea remedy — helpful if morning medications cause an unsettled stomach
- **Low-sodium stock** keeps the recipe appropriate for those watching salt intake
- **Light but filling** — the broth provides hydration alongside nutrients
- **Easily adjustable** — omit chilli for sensitive stomachs; add miso paste for a probiotic boost

---

**Macros (approx):** 36g protein · 48g carbs · 7g fat`,

  `## 🥗 Roasted Chickpea & Sweet Potato Bowl (35 min)

**Serves:** 1 (or make double for meal prep) · **~520 kcal**

---

### Ingredients

**Main components**
- 1 small sweet potato (about 200g), cut into 2cm cubes
- 1 × 400g tin chickpeas, drained and rinsed (use half, save half)
- 1 tsp olive oil · 1 tsp smoked paprika · ½ tsp cumin
- Salt and black pepper

**Base**
- 60g mixed salad leaves or baby spinach
- ½ cucumber, diced
- ½ red onion, thinly sliced (or a few spring onions)
- Handful of cherry tomatoes, halved

**Dressing (shake in a jar)**
- 2 tbsp extra virgin olive oil
- 1 tbsp lemon juice (about ½ lemon)
- 1 tsp honey or maple syrup
- 1 small clove garlic, grated (or pinch of garlic powder)
- Salt and pepper

**Optional toppings**
- 2 tbsp hummus
- A few walnuts or pumpkin seeds
- Fresh mint or coriander

---

### Step-by-Step Instructions

**Step 1 — Prep and season the sweet potato** *(5 min)*
1. Preheat oven to **210°C / 190°C fan** (or air fryer at 200°C)
2. Wash and cube the sweet potato — no need to peel, the skin adds texture
3. Spread cubes on a baking tray
4. Drizzle with ½ tsp olive oil, smoked paprika, cumin, salt and pepper
5. Toss to coat every piece evenly

**Step 2 — Prepare the chickpeas** *(2 min)*
1. Spread chickpeas on a clean section of the baking tray (or a separate tray)
2. Pat them dry with kitchen paper — **crucial step**: moisture = soggy chickpeas
3. Drizzle with ½ tsp olive oil, salt, pepper, and a pinch of extra paprika
4. Toss to coat

**Step 3 — Roast everything** *(25 min)*
1. Put the tray in the oven
2. After **15 minutes**, shake the tray to prevent sticking
3. Continue roasting for **10 more minutes**
4. Sweet potato is done when a fork slides through without resistance
5. Chickpeas should be golden and slightly crispy on the outside — taste one to check

**Step 4 — Make the dressing** *(2 min)*
1. Add all dressing ingredients to a small jar or bowl
2. Shake the jar vigorously (or whisk with a fork) until emulsified
3. Taste: should be tangy, slightly sweet, with a hint of garlic
4. Adjust with more lemon for tartness or honey for sweetness

**Step 5 — Assemble the bowl**
1. Lay salad leaves as the base
2. Scatter cucumber, red onion, and tomatoes over the leaves
3. Add roasted sweet potato cubes in one section
4. Add crispy chickpeas in another section (keeping them separate preserves their crunch)
5. Drizzle **half the dressing** over the whole bowl
6. Add a dollop of hummus, nuts/seeds, and herbs
7. Serve the remaining dressing on the side

---

### Meal Prep Version *(doubles the recipe)*

1. Roast **double** sweet potato and chickpeas
2. Keep components **separate** in containers — don't pre-dress
3. Refrigerate for up to **4 days**
4. Assemble fresh each day: takes under 2 minutes

---

💊 **Medication notes:**
- Chickpeas and sweet potato are excellent sources of potassium — relevant if you take medications that affect potassium (diuretics, ACE inhibitors). Discuss consistent intake with your doctor rather than avoiding them
- The anti-inflammatory properties of this bowl (olive oil, chickpeas, sweet potato) support general health

---

**Macros (approx):** 18g protein · 72g carbs · 20g fat`,

  `## 🫙 Overnight Oats — 3 Flavour Variations

**Prep:** 5 min the night before · **No cooking required · ~400 kcal**

---

### Base Recipe *(choose your flavour below)*

**Base Ingredients (for 1 serving)**
- 80g rolled oats (not instant — they go mushy)
- 200ml milk of your choice (dairy, oat, almond, soy)
- 1 tbsp chia seeds (optional but adds protein and omega-3)
- 1 tbsp maple syrup, honey, or 1 medjool date (blended)
- Pinch of salt

---

### Step-by-Step Base Method

**The night before — 5 minutes**
1. Add oats to a jar or container with a lid
2. Pour in 200ml milk
3. Add chia seeds, sweetener, and pinch of salt
4. Stir thoroughly — make sure the chia seeds are distributed, not clumped
5. Seal the container and refrigerate overnight (**minimum 6 hours, ideal 8–12**)

**In the morning — 2 minutes**
1. Remove from fridge and stir well
2. If too thick, add a splash more milk
3. Add your chosen toppings and eat immediately — or cold from the jar

---

### Flavour Option A — Berry & Almond

**Add to the base before refrigerating:**
- 1 tsp almond butter stirred through
- ½ tsp vanilla extract

**Morning toppings:**
- Large handful mixed berries (fresh or frozen-thawed)
- 1 tbsp flaked almonds
- Extra drizzle of almond butter

*Why it works:* Berries provide antioxidants; almonds provide slow-release energy. The vitamin C in berries can improve iron absorption — relevant if you take iron supplements.

---

### Flavour Option B — Banana & Peanut Butter

**Add to the base before refrigerating:**
- ½ banana, mashed and stirred through
- 1 tsp peanut butter

**Morning toppings:**
- Other ½ banana, sliced
- 1 tsp peanut butter drizzled
- A few dark chocolate chips (optional)
- Pinch of cinnamon

*Why it works:* Banana provides potassium and natural sweetness; peanut butter adds protein and healthy fats for lasting fullness.

---

### Flavour Option C — Apple & Cinnamon *(warming, comforting)*

**Add to the base before refrigerating:**
- ½ tsp cinnamon
- ½ tsp vanilla extract
- ¼ tsp nutmeg (optional)

**Morning toppings:**
- ½ apple, finely diced (or grated for softer texture)
- 1 tbsp chopped walnuts
- Drizzle of honey
- Extra cinnamon

*Why it works:* Cinnamon supports blood sugar regulation; walnuts provide omega-3s. This combination is particularly good for stable energy throughout the morning.

---

### Tips for Perfect Overnight Oats

✅ **Use rolled oats** — instant oats go too soft; steel-cut oats don't soften enough
✅ **Stir before refrigerating** — chia seeds clump if left unstirred
✅ **Adjust milk** — some milks thicken more; add extra in the morning if needed
✅ **Batch prep** — make 3–4 jars on Sunday for the whole week
🥶 **Keeps:** 4 days in the fridge (without banana — add that fresh)

---

💊 **Medication note:** Oats are an excellent source of fibre and are generally well-tolerated. If you take thyroid medication (levothyroxine), eat oats at least 1 hour after your dose as fibre can reduce absorption.

**Macros (approx, base + Option A):** 14g protein · 58g carbs · 12g fat`,
];

// ─── SPECIALTY CONTENT ───────────────────────────────────────────────────────

const LOW_IMPACT_WORKOUT = `## 🦴 Low-Impact Workout for Joint & Back Care (25 min)

*All movements are gentle on joints, knees, and the lower back. Go slowly — control matters more than speed.*

---

### Warm-Up — 5 minutes

**1. Seated Marching** *(2 min)*
- Sit upright in a sturdy chair, feet flat on the floor
- Lift your right knee slowly, hold 1 second, lower it
- Lift your left knee, hold 1 second, lower it
- Gradually increase the height and pace over 2 minutes
- Focus on sitting tall — don't let your back round

**2. Ankle Circles** *(1 min)*
- Still seated, lift one foot slightly off the floor
- Draw 10 slow circles clockwise, then 10 counter-clockwise
- Switch feet — this improves circulation and warms ankle joints

**3. Shoulder Shrugs & Rolls** *(1 min)*
- Inhale — shrug both shoulders up toward your ears, hold 2 seconds
- Exhale — drop them completely and roll them backward in a large circle
- Repeat 8 times; then reverse direction for 8 rolls

**4. Gentle Neck Stretch** *(1 min)*
- Tilt your right ear toward your right shoulder — feel the stretch on the left side of your neck
- Hold 15 seconds, breathe into the stretch
- Return to centre, then tilt left — hold 15 seconds
- Do not roll the head in full circles (this can compress the cervical spine)

---

### Main Session — 15 minutes

**1. Wall Squats (Chair Squats)** · 3 × 10 · Rest 30 sec
1. Stand with your back flat against a wall
2. Walk feet forward 30cm and place feet shoulder-width apart
3. Slowly slide down the wall until thighs are at a 45° angle (not parallel — less pressure on knees)
4. Hold 2 seconds at the bottom
5. Press through your heels and slide back up
6. *Easier option:* Lower only to 30° then return

**2. Seated Leg Extensions** · 3 × 12 each leg · Rest 20 sec
1. Sit near the edge of a chair, back straight
2. Slowly straighten your right leg until it's parallel to the floor
3. Flex your foot toward you — feel the quad engage
4. Hold 3 seconds, then lower slowly over 3 seconds
5. Complete all 12 reps on one side before switching
6. *Benefit:* Strengthens quads without compressing the knee joint

**3. Standing Hip Hinge** · 3 × 12 · Rest 20 sec
1. Stand behind a chair, lightly holding the back for balance
2. Feet hip-width apart, slight bend in knees
3. Hinge forward at the hips — push your bottom backward as if closing a drawer with it
4. Keep your back completely flat — imagine a plank lying along your spine
5. Lower your torso to about 45°, then drive hips forward to stand
6. *This restores healthy lower-back movement patterns*

**4. Side-Lying Clamshells** · 3 × 15 each side · Rest 20 sec
1. Lie on your side, hips and knees bent to 45°, feet stacked
2. Keeping your feet together, slowly rotate your top knee upward like a clamshell opening
3. Pause at the top — squeeze the outer hip/glute
4. Lower with control — 3 seconds down
5. *Strengthens the hip abductors, which protect both hips and lower back*

**5. Cat-Cow (Floor or Standing)** · 2 × 10 · Rest 15 sec
*Floor version:*
1. Start on hands and knees, wrists under shoulders, knees under hips
2. Inhale — let your belly drop, lift your chest and tailbone (cow)
3. Exhale — round your spine toward the ceiling, tuck chin and pelvis (cat)
4. Move slowly and fluidly, matching breath to movement

*Standing version (if floor isn't comfortable):*
1. Stand with hands on thighs, slight knee bend
2. Same spinal movement — arch on the inhale, round on the exhale

---

### Cool-Down — 5 minutes

**Supine Knee-to-Chest** *(45 sec each side)*
- Lie on your back, legs straight
- Pull one knee gently toward your chest with both hands
- Hold — breathe deeply — let the lower back release
- Keep the other leg straight on the floor

**Butterfly Stretch** *(1 min)*
- Sit on the floor, soles of feet together, knees dropping out to the sides
- Hold your feet, sit tall, breathe — don't push the knees down
- Lean forward very slightly from the hips for a deeper stretch

**Corpse Pose with Breath Awareness** *(2 min)*
- Lie flat on your back, arms at your sides, eyes closed
- Take 10 slow, deep breaths
- With each exhale, consciously relax a different body part: feet, calves, thighs, hips, back, shoulders, hands, face

---
💊 *Always get clearance from your GP or physiotherapist before starting exercise if you have a diagnosed spinal condition, recent joint replacement, or are recovering from injury. Start with fewer reps and build up over 2–3 weeks.*`;

const VEGETARIAN_RECIPE = `## 🥦 Spiced Lentil & Sweet Potato Soup (35 min)

**Serves:** 2 (or 1 + lunch tomorrow) · **Prep:** 8 min · **Cook:** 27 min · **~390 kcal per serving**

---

### Ingredients

- 1 medium sweet potato (~250g), peeled and diced into 2cm cubes
- 150g red lentils, rinsed under cold water
- 1 × 400g tin chopped tomatoes
- 750ml low-salt vegetable stock (from a cube is fine)
- 1 medium onion, diced
- 3 cloves garlic, minced
- 2cm fresh ginger, grated (or ½ tsp ground ginger)
- 1 tbsp olive oil
- 1½ tsp ground cumin
- 1 tsp ground coriander
- ½ tsp turmeric
- ½ tsp smoked paprika
- Pinch of chilli flakes (optional)
- Salt and black pepper
- Juice of ½ lemon

**To serve:**
- Fresh coriander or parsley
- 1 tbsp Greek yoghurt (optional, omit for vegan)
- Crusty wholegrain bread or flatbread

---

### Step-by-Step Instructions

**Step 1 — Prep everything before you start** *(8 min)*
1. Peel and dice the sweet potato — uniform cubes cook evenly
2. Dice the onion finely — smaller pieces dissolve into the soup and add sweetness
3. Mince the garlic and grate the ginger
4. Rinse red lentils in a sieve under cold water until the water runs clear — this removes excess starch and prevents foaming
5. Measure out all spices into a small bowl — this makes step 3 much easier

**Step 2 — Build the flavour base** *(5 min)*
1. Heat olive oil in a large saucepan over **medium heat**
2. Add the onion and cook **4–5 minutes**, stirring occasionally, until softened and translucent
3. Add garlic and ginger — cook **1 minute**, stirring constantly — they should smell incredible but not brown
4. Add ALL the spices at once: cumin, coriander, turmeric, paprika, chilli flakes
5. Stir the spices into the onion mix and cook **1 more minute** — this "blooms" the spices, intensifying their flavour

**Step 3 — Add the main ingredients** *(2 min)*
1. Add the diced sweet potato — stir to coat in the spiced oil
2. Pour in the tinned tomatoes, then the stock
3. Add the rinsed lentils
4. Season with salt and pepper
5. Stir everything together and bring to a boil

**Step 4 — Simmer until tender** *(20 min)*
1. Once boiling, reduce heat to a **gentle simmer** (small bubbles, not rolling)
2. Cook uncovered for **18–20 minutes**, stirring occasionally
3. Test at 18 minutes: sweet potato should be fork-tender and lentils completely soft and dissolving into the soup
4. If the soup is thicker than you'd like, add a splash more stock or water

**Step 5 — Finish and serve**
1. Remove from heat
2. Squeeze in the lemon juice — this brightens all the flavours
3. Taste and adjust: more salt? More lemon? More chilli?
4. Ladle into bowls
5. Add a swirl of yoghurt if using (omit for vegan)
6. Scatter fresh herbs on top
7. Serve with bread for dipping

---

### Why This Recipe is Great

🌱 **Plant-based complete protein** — lentils + sweet potato together provide all essential amino acids
💛 **Turmeric** has anti-inflammatory properties — relevant for anyone managing chronic conditions
🧄 **Garlic & ginger** support immune function and digestion
🥶 **Freezes beautifully** — freeze in portions for up to 3 months

---
💊 *Lentils are high in folate and iron. If you take iron supplements or are iron-deficient, eating vitamin C-rich foods (like this lemon-spiked soup) with your meal increases iron absorption by up to 3×.*

**Macros per serving:** 20g protein · 65g carbs · 7g fat`;

const HIGH_PROTEIN_RECIPE = `## 💪 High-Protein Turkey & Quinoa Bowl (25 min)

**Serves:** 1 · **Prep:** 5 min · **Cook:** 20 min · **~550 kcal · 52g protein**

---

### Ingredients

**Protein**
- 150g turkey breast mince (or chicken breast, diced small)
- 1 tsp olive oil
- 1 tsp smoked paprika · ½ tsp garlic powder · Salt and pepper

**Base**
- 80g quinoa (dry weight) — rinse before cooking
- 200ml water or stock for cooking the quinoa

**Vegetables**
- 1 cup broccoli florets
- 1 red pepper, diced
- 1 spring onion, sliced

**Dressing**
- 1 tbsp low-fat Greek yoghurt
- 1 tsp lemon juice
- ½ tsp Dijon mustard
- Salt and pepper

**Optional toppings**
- 1 tbsp pumpkin seeds (+5g protein)
- Handful of spinach (wilted into the turkey)

---

### Step-by-Step Instructions

**Step 1 — Cook the quinoa** *(20 min, mostly hands-off)*
1. Rinse quinoa in a fine sieve under cold water for 30 seconds — removes the bitter coating
2. Add to a small saucepan with 200ml water (or stock for more flavour) and a pinch of salt
3. Bring to a boil, then reduce to lowest simmer
4. Cover and cook **15 minutes** — do not lift the lid
5. After 15 minutes, remove from heat and leave covered for 5 minutes
6. Fluff with a fork — the quinoa should look slightly translucent with a white spiral visible

**Step 2 — Cook the turkey** *(8 min)*
1. Heat 1 tsp olive oil in a non-stick frying pan over **medium-high heat**
2. Add the turkey mince in a single layer — don't stir immediately
3. Leave for **2 minutes** so it gets some colour on the bottom
4. Break it up with a spatula, add paprika, garlic powder, salt, and pepper
5. Cook, stirring occasionally, for another **5–6 minutes** until no pink remains and some pieces are lightly golden
6. In the last minute, add a large handful of spinach if using — stir until wilted

**Step 3 — Steam the broccoli** *(4 min)*
*Method A — Microwave (easiest):*
1. Place broccoli florets in a microwave-safe bowl with 2 tbsp water
2. Cover with a plate or cling film
3. Microwave on high for **3–4 minutes** until just tender

*Method B — Pan:*
1. Add broccoli to the same pan used for the turkey (after removing it)
2. Add a splash of water, cover with a lid
3. Steam for **3 minutes** over medium heat

**Step 4 — Make the dressing** *(1 min)*
1. Mix Greek yoghurt, lemon juice, and Dijon mustard in a small bowl
2. Add salt and pepper to taste
3. If too thick, add a splash of water to loosen it

**Step 5 — Assemble**
1. Add quinoa to your bowl as the base
2. Add the broccoli and diced raw red pepper alongside
3. Pile the cooked turkey on top
4. Drizzle the yoghurt dressing over everything
5. Scatter pumpkin seeds and spring onion
6. Eat immediately while warm

---

### Protein Breakdown

| Ingredient | Protein |
|---|---|
| Turkey breast (150g) | ~33g |
| Quinoa (80g dry) | ~11g |
| Greek yoghurt dressing | ~4g |
| Pumpkin seeds | ~5g |
| **Total** | **~52g** |

---

### Meal Prep Version
- Cook double quinoa and turkey on Sunday
- Portion into containers — keeps 4 days in the fridge
- Add fresh veg and dressing each day
- One prep session = 4 high-protein lunches

---
💊 *High protein intake is safe with most medications. If you take kidney-related medications or have been advised to limit protein, discuss intake targets with your doctor. Quinoa is naturally gluten-free — safe if you have a gluten sensitivity.*`;

// ─── RESPONSE BUILDER ────────────────────────────────────────────────────────

function buildLocalResponse(text, medications, lowMeds, todayMood) {
  const t = text.toLowerCase();

  // — Refills —
  if (lowMeds.length > 0 && (t.includes('refill') || t.includes('supply') || t.includes('running out') || t.includes('low med'))) {
    const list = lowMeds.map(m => {
      const days = Math.floor(m.quantity_remaining / (m.times?.length || 1));
      return `• **${m.name}** — ~${days} day${days === 1 ? '' : 's'} remaining`;
    }).join('\n');
    return `Here are the medications running low:\n\n${list}\n\nI'd recommend contacting your pharmacy soon. Would you like tips on setting up automated refill reminders?`;
  }
  if (medications.length > 0 && (t.includes('refill') || t.includes('supply'))) {
    return `All your medications look well-stocked right now! I'll flag any that are running low. Is there anything else I can help with today?`;
  }

  // — "Give me another" / "something different" — advance the last category's counter —
  const wantsAnother = /\b(another|different|other|next|else|again|more|vary|variation|new one|change)\b/.test(t);
  if (wantsAnother && lastCategory) {
    if (lastCategory === 'gentle')   return pick(GENTLE_WORKOUTS, 'gentle');
    if (lastCategory === 'moderate') return pick(MODERATE_WORKOUTS, 'moderate');
    if (lastCategory === 'high')     return pick(HIGH_ENERGY_WORKOUTS, 'high');
    if (lastCategory === 'recipe')   return pick(RECIPES, 'recipe');
    if (lastCategory === 'lowimpact') return LOW_IMPACT_WORKOUT;
    if (lastCategory === 'veg')      return VEGETARIAN_RECIPE;
    if (lastCategory === 'protein')  return HIGH_PROTEIN_RECIPE;
  }

  // — Specific workout modifiers (check BEFORE general workout catch) —
  if (/\b(back pain|back ache|backache|spine|lower back|lumbar|sciatica|knee|joint|arthritis|hip pain|low impact|no impact)\b/.test(t)) {
    lastCategory = 'lowimpact';
    return LOW_IMPACT_WORKOUT;
  }
  if (/\b(gentle|restorative|easy workout|light workout|rest day|recovery day|stretching|stretch routine|yoga|mobility)\b/.test(t)) {
    lastCategory = 'gentle';
    return pick(GENTLE_WORKOUTS, 'gentle');
  }
  if (/\b(hiit|intense|hard workout|challenging|push myself|maximum|advanced|power|sprint|intervals)\b/.test(t)) {
    lastCategory = 'high';
    return pick(HIGH_ENERGY_WORKOUTS, 'high');
  }
  if (/\b(cardio|cardio workout|fat burn|endurance|running|jogging|cycling|aerobic)\b/.test(t)) {
    lastCategory = 'moderate';
    return pick(MODERATE_WORKOUTS, 'moderate');
  }
  if (/\b(strength|weights|muscle|build muscle|lift|resistance|bodyweight strength)\b/.test(t)) {
    lastCategory = 'high';
    return pick(HIGH_ENERGY_WORKOUTS, 'high');
  }
  if (/\b(quick workout|short workout|fast workout|10 min|15 min|no time|5 minute|brief)\b/.test(t)) {
    lastCategory = 'gentle';
    return pick(GENTLE_WORKOUTS, 'gentle');
  }
  if (/\b(beginner|start exercising|new to exercise|getting back|haven.?t exercised|first workout|out of shape)\b/.test(t)) {
    lastCategory = 'moderate';
    return pick(MODERATE_WORKOUTS, 'moderate');
  }

  // — General workout (energy-aware) —
  if (/\b(workout|exercise|fitness|gym|training|run|jog|move|active|physical)\b/.test(t)) {
    const energy = Number(todayMood?.energy_level);
    if (todayMood && energy <= 3) { lastCategory = 'gentle';   return pick(GENTLE_WORKOUTS, 'gentle'); }
    if (todayMood && energy >= 7) { lastCategory = 'high';     return pick(HIGH_ENERGY_WORKOUTS, 'high'); }
    lastCategory = 'moderate';
    return pick(MODERATE_WORKOUTS, 'moderate');
  }

  // — Specific recipe types (check BEFORE general recipe catch) —
  if (/\b(vegetarian|vegan|plant.?based|meat.?free|no meat|veggie meal|meatless)\b/.test(t)) {
    lastCategory = 'veg';
    return VEGETARIAN_RECIPE;
  }
  if (/\b(high.?protein|protein.?rich|post.?workout meal|muscle gain|build muscle|protein target|macros)\b/.test(t)) {
    lastCategory = 'protein';
    return HIGH_PROTEIN_RECIPE;
  }
  if (/\b(quick recipe|fast recipe|easy meal|simple meal|15 min|10 min|no cook|can.?t cook|no time to cook|lazy meal)\b/.test(t)) {
    lastCategory = 'recipe';
    return RECIPES[1]; // egg scramble — 12 min
  }
  if (/\b(breakfast|morning meal|first meal|before work|overnight oats|oats)\b/.test(t)) {
    lastCategory = 'recipe';
    return RECIPES[4]; // overnight oats
  }
  if (/\b(soup|warm meal|comforting|comfort food|cold day)\b/.test(t)) {
    lastCategory = 'veg';
    return VEGETARIAN_RECIPE; // lentil soup
  }
  if (/\b(noodle|asian|ginger|chicken soup|broth)\b/.test(t)) {
    lastCategory = 'recipe';
    return RECIPES[2]; // chicken noodle soup
  }
  if (/\b(salad|bowl|chickpea|sweet potato|plant|fibre)\b/.test(t)) {
    lastCategory = 'recipe';
    return RECIPES[3]; // chickpea sweet potato bowl
  }
  if (/\b(salmon|fish|omega)\b/.test(t)) {
    lastCategory = 'recipe';
    return RECIPES[0]; // salmon bowl
  }
  if (/\b(egg|scramble|omelette|frittata|protein breakfast)\b/.test(t)) {
    lastCategory = 'recipe';
    return RECIPES[1]; // egg scramble
  }

  // — General recipe (mood-aware) —
  if (/\b(recipe|food|eat|cook|meal|dinner|lunch|nutrition|diet|ingredient|what.?s for|make for|prepare)\b/.test(t)) {
    lastCategory = 'recipe';
    if (todayMood?.mood === 'low' || todayMood?.mood === 'struggling') return RECIPES[1];
    return pick(RECIPES, 'recipe');
  }

  // — Sleep —
  if (t.includes('sleep') || t.includes('insomnia') || t.includes('fatigue')) {
    return `## 😴 Sleep Improvement Guide

A consistent, quality sleep routine is one of the most powerful tools for health.

---

### The Core Habits (in order of impact)

**1. Fixed wake time — the single most important habit**
- Choose a wake time and keep it every day, including weekends
- Set an alarm and **don't snooze** — snoozing fragments sleep and causes grogginess
- Your body clock anchors to wake time, not bedtime; the right bedtime follows naturally

**2. Wind-down routine — 30 to 60 minutes before bed**
- Dim the lights in your home (bright light suppresses melatonin)
- Stop using screens or use night mode / blue light glasses
- Suggestions: read a physical book, light stretching, a warm shower, herbal tea (chamomile or valerian), gentle music

**3. The bedroom is only for sleep**
- No TV, no working, no scrolling in bed
- Your brain learns: bed = sleep. It takes about 2 weeks to establish

**4. Temperature**
- 16–19°C is the scientifically optimal range for sleep
- A warm shower 1–2 hours before bed raises then drops your core temperature, triggering drowsiness

**5. Caffeine cut-off**
- Caffeine has a half-life of about **6 hours**
- A coffee at 3pm still has half its caffeine in your system at 9pm
- Cut off at **2pm** as a starting point; sensitive people may need to stop at midday

---

### If You Wake in the Night

- If you've been awake for more than **20 minutes**, get out of bed
- Do something calm in dim light (reading, gentle stretching)
- Return only when you feel genuinely sleepy
- This prevents your brain from associating bed with wakefulness

---

### Medication and Sleep

💊 Some medications affect sleep:
- **Beta-blockers** can suppress melatonin — discuss with your doctor if this is a concern
- **Steroids** taken late in the day often cause sleep disruption — take them in the morning if your prescription allows
- **Diuretics** taken too late cause night-time urination — ask your pharmacist about timing
- **Antihistamines** can cause grogginess the following day

Track your sleep quality in the daily mood log to spot patterns.`;
  }

  // — Stress / anxiety —
  if (t.includes('stress') || t.includes('anxious') || t.includes('anxiety') || t.includes('worry') || t.includes('overwhelm')) {
    return `## 🧘 Stress Management Techniques

---

### Immediate Tools (use right now)

**Box Breathing — 4 minutes**
1. Inhale through your nose for **4 counts**
2. Hold for **4 counts**
3. Exhale slowly through your mouth for **4 counts**
4. Hold for **4 counts**
5. Repeat **8 cycles** — about 4 minutes total
6. This activates the parasympathetic nervous system and reduces cortisol within minutes

**5-4-3-2-1 Grounding**
When anxiety feels overwhelming, name out loud (or write down):
- **5 things** you can see
- **4 things** you can physically feel (the chair beneath you, your feet on the floor)
- **3 things** you can hear
- **2 things** you can smell
- **1 thing** you can taste
This interrupts the anxiety loop by bringing your attention to the present moment.

---

### Daily Habits That Reduce Baseline Stress

**Physical movement** — even a 10-minute walk lowers cortisol for several hours after
**Consistent sleep** — poor sleep raises cortisol; quality sleep is the foundation of resilience
**Limiting news/social media** — schedule 1 check-in rather than constant scrolling
**Journaling** — spend 5 minutes each morning writing anything on your mind to "empty the buffer"
**Saying no** — stress often accumulates from overcommitment; protect time for recovery

---

### Stress and Your Medications

💊 Chronic stress can affect medication efficacy and absorption in some cases. If you notice:
- Forgetting doses more often
- Side effects worsening
- Poor sleep affecting when you take medications

... these are worth mentioning to your GP. You're not alone, and support is available.`;
  }

  // — Motivation / habits —
  if (t.includes('motivation') || t.includes('forget') || t.includes('habit') || t.includes('routine') || t.includes('streak') || t.includes('miss') || t.includes('consistent')) {
    return `## 🔥 Building a Medication Habit That Sticks

---

### The Science of Habit Formation

Habits form when a **cue → routine → reward** loop is repeated consistently. The goal is to attach your medication routine to existing behaviours.

---

### Step-by-Step: Build Your Routine

**Step 1 — Choose an anchor habit**
Pick something you already do every day without thinking:
- Making your first cup of tea or coffee
- Brushing your teeth
- Eating breakfast
- Checking your phone first thing

**Step 2 — Place medications visibly**
- Store medications **next to** the anchor habit object (by the kettle, next to the toothbrush)
- Out of sight = out of mind. Visible = automatic

**Step 3 — Set a specific alarm, not a vague reminder**
- "8:00am" is far more reliable than "morning"
- Label the alarm: "Hydrocortisone — with breakfast" so you know exactly what to do when it fires

**Step 4 — Track your streak**
- Your **Progress** tab shows your current streak 🔥
- Streaks create motivation — seeing the number grow makes you want to protect it

**Step 5 — Plan for disruption**
- Identify your 2 most common reasons for missing doses (busy morning? Traveling? Sleeping elsewhere?)
- Create a specific plan for each: "If I'm traveling, I'll put meds in my wash bag the night before"

---

### When You Miss a Dose

1. **Don't double up** unless your medication leaflet specifically says to
2. Check the patient information leaflet — it will say what to do
3. Log it in the app honestly — your streak will recover
4. Ask yourself: what caused this miss? Then solve that specific problem

---

### The Most Underrated Strategy

**Self-compassion.** Research shows that people who are kind to themselves after a missed dose are *more* likely to get back on track than those who feel guilty. One miss does not break a habit — it's a data point, not a failure.`;
  }

  // — Progress / adherence —
  if (t.includes('progress') || t.includes('adherence') || t.includes('how am i') || t.includes('review') || t.includes('doing')) {
    const total = medications.length;
    if (total === 0) {
      return `You haven't added any medications yet — once you do, I can help you track your adherence and celebrate your streaks. Head to the **Meds** tab to get started! 💊`;
    }
    return `You're currently tracking **${total} medication${total === 1 ? '' : 's'}**.

Head to your **Progress** tab for your full adherence stats, streaks, and weekly trends.

---

### Questions to Reflect On

1. Are there specific **times of day** where you tend to miss doses?
2. Has your **routine changed** recently (new job, travel, different schedule)?
3. Do any medications cause **side effects** that make you hesitant to take them?
4. Are any medications running **low on supply**?

Sharing your answers to questions 1–3 with your pharmacist or GP can lead to practical solutions — like adjusting timing, changing formulation, or additional support.`;
  }

  // — Default —
  return `Here's what I can help you with — just ask naturally and I'll give you the full guide:

**🏋️ Workouts** *(full step-by-step instructions)*
- "Give me a workout for today" — matched to your current energy level
- "Something gentle / easy / recovery"
- "Quick workout — I don't have much time"
- "I have back pain / bad knees" — low-impact program
- "Intense workout / HIIT / strength training"
- "Give me another one" — rotates to a different routine

**🍽️ Recipes** *(full ingredients + step-by-step method)*
- "Give me a healthy recipe"
- "Vegetarian meal" or "Vegan recipe"
- "High protein meal" — with macro breakdown
- "Quick meal under 15 minutes"
- "Breakfast ideas" — overnight oats with variations
- "Chicken soup" / "Salmon bowl" / "Chickpea salad"

**💊 Medications**
- "Check my refills" — real data from your medication list
- "Help me build a medication habit"
- "I keep forgetting my meds"

**😴 Wellbeing**
- "Sleep tips" or "I have insomnia"
- "Stress management" / "I'm feeling anxious"
- "How's my progress?" — adherence reflection
- "Energy boost tips"

Just ask! 💚`;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function HealthCoach() {
  const [messages, setMessages] = useState(() => loadMessages());
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: healthProfile } = useQuery({
    queryKey: ['healthProfile'],
    queryFn: async () => {
      const profiles = await entities.HealthProfile.list();
      return profiles[0] || null;
    }
  });

  const { data: todayMood } = useQuery({
    queryKey: ['todayMood'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const moods = await entities.DailyMood.filter({ date: today });
      return moods[0] || null;
    }
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['coachMedications'],
    queryFn: () => entities.Medication.filter({ active: true })
  });

  const { data: refillOrders = [] } = useQuery({
    queryKey: ['coachRefillOrders'],
    queryFn: () => entities.RefillOrder.filter({ status: 'pending' })
  });

  const lowMeds = medications.filter(med => {
    if (!med.quantity_remaining || !med.times?.length) return false;
    return Math.floor(med.quantity_remaining / med.times.length) <= (med.refill_reminder_days || 7);
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText = null) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isTyping) return;

    setInput('');
    const userMsg = { role: 'user', content: textToSend };
    const withUser = [...messages, userMsg];
    setMessages(withUser);
    saveMessages(withUser);

    setIsTyping(true);
    await new Promise(r => setTimeout(r, 500 + Math.random() * 400));

    const responseText = buildLocalResponse(textToSend, medications, lowMeds, todayMood);
    const withResponse = [...withUser, { role: 'assistant', content: responseText }];
    setMessages(withResponse);
    saveMessages(withResponse);
    setIsTyping(false);
  };

  const handleVoiceTranscript = (transcript) => {
    setInput(transcript);
    sendMessage(transcript);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    {
      label: "Workout for today",
      prompt: todayMood
        ? `Give me a workout for today. My mood is ${todayMood.mood} and energy is ${todayMood.energy_level ?? '?'}/10.`
        : "Give me a workout routine for today"
    },
    {
      label: "Give me a recipe",
      prompt: todayMood && (todayMood.mood === 'low' || todayMood.mood === 'struggling')
        ? "I'm not feeling great today. Give me a simple, nourishing recipe."
        : "Give me a healthy recipe with step by step instructions"
    },
    {
      label: "Check my refills",
      prompt: lowMeds.length > 0
        ? `I have ${lowMeds.length} medication(s) running low — can you check my refills?`
        : "Check my medication supply and refills"
    },
    { label: "Progress review", prompt: "Review my medication progress and adherence" },
    { label: "Energy boost", prompt: "What can I do to boost my energy levels today?" },
    { label: "Better sleep", prompt: "Give me a sleep improvement guide" }
  ];

  return (
    <div className="flex flex-col h-screen" style={{ height: '100dvh' }}>
      <RootPageHeader title="AI Health Coach" subtitle="Personalised wellness guidance" />

      <div className="flex-1 overflow-hidden px-4 md:px-6 lg:px-8 pt-4 pb-2 flex flex-col max-w-5xl mx-auto w-full">
        {/* Context card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <Card className="lg:col-span-3 border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Heart className="w-5 h-5 text-green-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Coach Context</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {todayMood ? (
                        <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700">
                          <Smile className="w-3 h-3 mr-1" />
                          Mood: {todayMood.mood} ({todayMood.energy_level ?? '?'}/10 energy)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-gray-400">No mood logged today</Badge>
                      )}
                      {lowMeds.length > 0 && (
                        <Badge variant="outline" className="text-xs bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {lowMeds.length} med{lowMeds.length > 1 ? 's' : ''} running low
                        </Badge>
                      )}
                      {healthProfile && (
                        <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300">
                          Profile: {healthProfile.fitness_level}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      {healthProfile ? 'Edit' : 'Setup'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Health Profile</DialogTitle>
                      <DialogDescription>Help your AI coach provide better recommendations</DialogDescription>
                    </DialogHeader>
                    <HealthProfileSetup onComplete={() => setSetupOpen(false)} />
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
          <div className="hidden lg:block"><SavedWorkoutsPanel /></div>
          <div className="hidden lg:block"><SavedRecipesPanel /></div>
        </div>

        <div className="lg:hidden space-y-4 mb-4">
          <SavedWorkoutsPanel />
          <SavedRecipesPanel />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.length === 0 ? (
            <Card className="border-2 border-dashed dark:border-gray-700">
              <CardContent className="p-8 text-center">
                <Sparkles className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 dark:text-white">Your AI Health Coach</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Get full step-by-step workout programs, complete recipes with instructions, sleep guides, and more — all adapted to your energy and medication schedule.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
                  {quickActions.map((action, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-3 whitespace-normal dark:border-gray-600 dark:text-gray-300"
                      onClick={() => sendMessage(action.prompt)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {messages.map((message, idx) => (
                <MessageBubble key={idx} message={message} />
              ))}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="h-7 w-7 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center mt-0.5">
                    <Heart className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask for a workout, recipe, sleep tips..."
              disabled={isTyping}
              className="flex-1 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
            <VoiceInput onTranscript={handleVoiceTranscript} disabled={isTyping} />
            <Button onClick={() => sendMessage()} disabled={!input.trim() || isTyping} className="select-none">
              {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

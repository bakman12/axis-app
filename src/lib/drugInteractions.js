// drugInteractions.js
// ─────────────────────────────────────────────────────────────────────────────
// Client-side drug interaction checker. Pattern-based matching against common
// medication names (brand and generic). No API required — works fully offline.
//
// SEVERITY LEVELS:
//   'critical' — potentially life-threatening, always warn
//   'high'     — significant risk, always warn
//   'moderate' — worth knowing, warn when adding
//
// HOW MATCHING WORKS:
//   Each rule has two regex patterns. If a user's medication list contains
//   matches for both patterns, the interaction is flagged.
//   Matching is case-insensitive against medication name + dosage_form.
// ─────────────────────────────────────────────────────────────────────────────

const INTERACTIONS = [
  // ── Blood thinners ──────────────────────────────────────────────────────────
  {
    drugs:    [/warfarin|coumadin|waran/i, /aspirin|ibuprofen|naproxen|diclofenac|celecoxib/i],
    severity: 'high',
    message:  'Increased bleeding risk. Monitor closely and consult your doctor.',
  },
  {
    drugs:    [/warfarin|coumadin/i, /amiodarone|cordarone/i],
    severity: 'high',
    message:  'Amiodarone significantly raises warfarin levels, increasing bleeding risk.',
  },
  {
    drugs:    [/warfarin|coumadin/i, /fluconazole|metronidazole|ciprofloxacin/i],
    severity: 'high',
    message:  'This antibiotic/antifungal can significantly increase warfarin effect.',
  },

  // ── Serotonin syndrome ───────────────────────────────────────────────────────
  {
    drugs:    [/phenelzine|tranylcypromine|selegiline|rasagiline|maoi/i, /sertraline|fluoxetine|paroxetine|citalopram|escitalopram|venlafaxine|duloxetine|ssri|snri/i],
    severity: 'critical',
    message:  'MAOI + SSRI/SNRI combination can cause life-threatening serotonin syndrome. Do not take together.',
  },
  {
    drugs:    [/sertraline|fluoxetine|paroxetine|citalopram|escitalopram|ssri/i, /tramadol|ultram/i],
    severity: 'high',
    message:  'Risk of serotonin syndrome. Symptoms include agitation, rapid heart rate, high temperature.',
  },
  {
    drugs:    [/sertraline|fluoxetine|paroxetine|citalopram|escitalopram|ssri/i, /linezolid|zyvox/i],
    severity: 'critical',
    message:  'Linezolid + SSRI can cause serotonin syndrome. Consult your doctor immediately.',
  },

  // ── Heart medications ────────────────────────────────────────────────────────
  {
    drugs:    [/digoxin|lanoxin/i, /amiodarone|verapamil|diltiazem/i],
    severity: 'high',
    message:  'Can raise digoxin to toxic levels. Requires dose adjustment and monitoring.',
  },
  {
    drugs:    [/beta.?blocker|metoprolol|atenolol|bisoprolol|carvedilol|propranolol/i, /verapamil|diltiazem/i],
    severity: 'high',
    message:  'Both slow heart rate — combining can cause dangerous bradycardia or heart block.',
  },

  // ── Lithium ──────────────────────────────────────────────────────────────────
  {
    drugs:    [/lithium|priadel|camcolit/i, /ibuprofen|naproxen|diclofenac|nsaid/i],
    severity: 'high',
    message:  'NSAIDs raise lithium levels and can cause toxicity. Use paracetamol instead.',
  },
  {
    drugs:    [/lithium/i, /ace.?inhibitor|lisinopril|ramipril|enalapril|perindopril/i],
    severity: 'high',
    message:  'ACE inhibitors can raise lithium to toxic levels.',
  },

  // ── Metformin ────────────────────────────────────────────────────────────────
  {
    drugs:    [/metformin|glucophage/i, /contrast.?dye|iodinated/i],
    severity: 'high',
    message:  'Stop metformin before any procedure using contrast dye — risk of lactic acidosis.',
  },

  // ── Statins ──────────────────────────────────────────────────────────────────
  {
    drugs:    [/simvastatin|lovastatin/i, /amiodarone|verapamil|diltiazem|amlodipine/i],
    severity: 'moderate',
    message:  'Increased risk of muscle damage (myopathy). A lower statin dose may be needed.',
  },
  {
    drugs:    [/simvastatin|lovastatin|atorvastatin/i, /clarithromycin|erythromycin|itraconazole|ketoconazole/i],
    severity: 'high',
    message:  'This drug significantly raises statin levels, increasing muscle damage risk.',
  },

  // ── Potassium ────────────────────────────────────────────────────────────────
  {
    drugs:    [/ace.?inhibitor|lisinopril|ramipril|enalapril|perindopril|losartan|valsartan/i, /potassium|spironolactone|eplerenone/i],
    severity: 'moderate',
    message:  'Risk of dangerously high potassium (hyperkalemia). Monitor potassium levels.',
  },

  // ── Antibiotics ──────────────────────────────────────────────────────────────
  {
    drugs:    [/rifampicin|rifampin/i, /oral.?contraceptive|pill|levonorgestrel|ethinylestradiol/i],
    severity: 'high',
    message:  'Rifampicin reduces contraceptive effectiveness. Use additional contraception.',
  },
  {
    drugs:    [/metronidazole|flagyl/i, /alcohol/i],
    severity: 'high',
    message:  'Severe nausea, vomiting and flushing if alcohol is consumed. Avoid alcohol completely.',
  },

  // ── Antacids / absorption ────────────────────────────────────────────────────
  {
    drugs:    [/antacid|omeprazole|lansoprazole|pantoprazole|esomeprazole|ppi/i, /clopidogrel|plavix/i],
    severity: 'moderate',
    message:  'PPIs reduce clopidogrel effectiveness. Discuss alternatives with your doctor.',
  },
  {
    drugs:    [/antacid|calcium|magnesium|aluminium/i, /levothyroxine|thyroxine/i],
    severity: 'moderate',
    message:  'Antacids and calcium block thyroid medication absorption. Take 4 hours apart.',
  },
  {
    drugs:    [/antacid|calcium|magnesium|aluminium/i, /ciprofloxacin|levofloxacin|doxycycline|tetracycline/i],
    severity: 'moderate',
    message:  'Antacids block antibiotic absorption. Take at least 2 hours apart.',
  },

  // ── Diabetes ─────────────────────────────────────────────────────────────────
  {
    drugs:    [/insulin|glipizide|gliclazide|glibenclamide|sulfonylurea/i, /beta.?blocker|metoprolol|atenolol|bisoprolol/i],
    severity: 'moderate',
    message:  'Beta-blockers can mask low blood sugar symptoms. Monitor glucose more carefully.',
  },

  // ── Pain / opioids ───────────────────────────────────────────────────────────
  {
    drugs:    [/opioid|morphine|codeine|oxycodone|fentanyl|tramadol|buprenorphine/i, /benzodiazepine|diazepam|lorazepam|alprazolam|temazepam|zopiclone|zolpidem/i],
    severity: 'critical',
    message:  'Opioid + sedative combination significantly increases risk of respiratory depression and death.',
  },
];

/**
 * Find interactions between a new medication and an existing list.
 *
 * @param {string} newMedName         — name of the medication being added
 * @param {object[]} existingMeds     — array of existing medication entities
 * @returns {object[]}                — array of { drug1, drug2, severity, message }
 */
export function checkInteractions(newMedName, existingMeds) {
  if (!newMedName || !existingMeds?.length) return [];

  const warnings = [];

  for (const rule of INTERACTIONS) {
    const [patternA, patternB] = rule.drugs;

    // Check if newMed matches either pattern, and an existing med matches the other
    const newMatchesA = patternA.test(newMedName);
    const newMatchesB = patternB.test(newMedName);

    for (const existing of existingMeds) {
      const existingName = `${existing.name ?? ''} ${existing.dosage_form ?? ''}`;
      const existMatchesA = patternA.test(existingName);
      const existMatchesB = patternB.test(existingName);

      if ((newMatchesA && existMatchesB) || (newMatchesB && existMatchesA)) {
        // Avoid duplicate warnings for the same rule
        const alreadyAdded = warnings.some(w => w.message === rule.message);
        if (!alreadyAdded) {
          warnings.push({
            drug1:    newMedName,
            drug2:    existing.name,
            severity: rule.severity,
            message:  rule.message,
          });
        }
      }
    }
  }

  // Sort: critical first, then high, then moderate
  const order = { critical: 0, high: 1, moderate: 2 };
  return warnings.sort((a, b) => order[a.severity] - order[b.severity]);
}

/**
 * Check every pair of active medications for interactions.
 * Returns all flagged pairs across the whole formulary.
 *
 * @param {object[]} medications — array of active medication entities
 * @returns {object[]}            — array of { drug1, drug2, severity, message }
 */
export function scanAllInteractions(medications) {
  if (!medications?.length) return [];
  const results = [];

  for (let i = 0; i < medications.length; i++) {
    for (let j = i + 1; j < medications.length; j++) {
      const a = `${medications[i].name ?? ''} ${medications[i].dosage_form ?? ''}`;
      const b = `${medications[j].name ?? ''} ${medications[j].dosage_form ?? ''}`;

      for (const rule of INTERACTIONS) {
        const [patA, patB] = rule.drugs;
        if ((patA.test(a) && patB.test(b)) || (patB.test(a) && patA.test(b))) {
          if (!results.some(r => r.message === rule.message)) {
            results.push({
              drug1:    medications[i].name,
              drug2:    medications[j].name,
              severity: rule.severity,
              message:  rule.message,
            });
          }
        }
      }
    }
  }

  const order = { critical: 0, high: 1, moderate: 2 };
  return results.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** Returns the Tailwind colour classes for a given severity. */
export function severityStyles(severity) {
  return {
    critical: { bg: 'bg-red-50 dark:bg-red-950/40',   border: 'border-red-400 dark:border-red-700',   text: 'text-red-800 dark:text-red-200',   badge: 'bg-red-600 text-white' },
    high:     { bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-400 dark:border-orange-700', text: 'text-orange-800 dark:text-orange-200', badge: 'bg-orange-500 text-white' },
    moderate: { bg: 'bg-yellow-50 dark:bg-yellow-950/40', border: 'border-yellow-400 dark:border-yellow-700', text: 'text-yellow-800 dark:text-yellow-200', badge: 'bg-yellow-500 text-white' },
  }[severity] ?? {};
}

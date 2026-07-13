// Seed script to populate the database with initial categories, items, and requirements
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const categories = [
  { name: "Wolverine Stack 2.0", description: "Healing and recovery peptides combining multiple benefits", sortOrder: 1 },
  { name: "Cognition / Mental Energy / Sleep", description: "Nootropics and sleep support peptides", sortOrder: 2 },
  { name: "Brain Restoration", description: "Brain regeneration and cognitive support", sortOrder: 3 },
  { name: "Lean Muscle / Fat Loss / Hormone Support", description: "Body composition and hormone optimization", sortOrder: 4 },
  { name: "Immunity", description: "Immune system support and longevity", sortOrder: 5 },
  { name: "Gut Health", description: "Digestive health and gut repair", sortOrder: 6 },
  { name: "Tinctures Anti-Aging", description: "Longevity and anti-aging tinctures", sortOrder: 7 },
  { name: "Fun & Tanning", description: "Lifestyle enhancement peptides", sortOrder: 8 },
  { name: "Mitochondria Reboot Anti-Aging", description: "Mitochondrial health and anti-aging", sortOrder: 9 },
  { name: "Skin Anti-Aging", description: "Skin health and anti-aging", sortOrder: 10 },
  { name: "BioRegulator Peptides", description: "Organ-specific bioregulator peptides", sortOrder: 11 },
  { name: "Adjuncts", description: "Supporting supplements and troches", sortOrder: 12 },
  { name: "Supplies", description: "Syringes, alcohol wipes, and other supplies", sortOrder: 13 },
  { name: "Services", description: "Coaching packages and services", sortOrder: 14 },
];

const protocolItems = [
  // Wolverine Stack 2.0 (categoryId: 1)
  { categoryId: 1, name: "CJC1295/Ipamorelin Blend", schedule: "1x/night fasted @ bedtime", duration: "90 days (weekends off; 1 week off at 6 weeks)", price: "165", defaultQty: 1, purpose: "Healing/Recovery", notes: "approx 48 doses total", itemType: "peptide", sortOrder: 1 },
  { categoryId: 1, name: "Tesamorelin 5MG", schedule: "1x/morning for HARD training days 1MG", duration: "as needed AM of HARD workouts", price: "71", defaultQty: 4, purpose: "Healing/Recovery", notes: "5 doses per vial", itemType: "peptide", sortOrder: 2 },
  { categoryId: 1, name: "BPC157 Acetate 10MG", schedule: "333 MCG 2x/day Mon-Fri (AM/PM)", duration: "90 days (Weekends off)", price: "95", defaultQty: 4, purpose: "Healing/Recovery/Gut Health", notes: "30 doses per vial, 2 doses per day, 15 days per vial", itemType: "peptide", sortOrder: 3 },
  { categoryId: 1, name: "Thymosin Beta 4 TB-500", schedule: "2.5 MG 2-3x / week spread out", duration: "90 days (take 1 week off at 6 weeks)", price: "134", defaultQty: 6, purpose: "Healing/Recovery/Longevity", notes: "12 weeks at 2.5mg 2x/week", itemType: "peptide", sortOrder: 4 },
  { categoryId: 1, name: "GHK-Cu Nasal -or- Injection", schedule: "2 sprays/day - see notes ->", duration: "90 days (take 1 week off at 6 weeks)", price: "100", defaultQty: 2, purpose: "Healing/Recovery/Longevity", notes: "Take Multi-Vitamin and/or Zinc while taking this; approx 50 doses per - or Injection w/ BPC in same syringe", itemType: "peptide", sortOrder: 5 },
  { categoryId: 1, name: "KPV 10MG", schedule: "500 mcg daily", duration: "90 days (Weekends off)", price: "96", defaultQty: 0, purpose: "Inflammation & Immunity", notes: "Reduces oxidative stress", itemType: "peptide", sortOrder: 6 },
  
  // Cognition / Mental Energy / Sleep (categoryId: 2)
  { categoryId: 2, name: "Adamax Amidate", schedule: "2 sprays/day - see notes ->", duration: "90 days (Weekends off)", price: "132", defaultQty: 0, purpose: "Cognitive Energy", notes: "2-4 sprays/day AM/Afternoon; Amidate form crosses blood brain best", itemType: "peptide", sortOrder: 1 },
  { categoryId: 2, name: "Semax / Selank Amidate Blend", schedule: "2 sprays/day - see notes ->", duration: "90 days (Weekends off)", price: "146", defaultQty: 0, purpose: "Cognitive Energy", notes: "2-4 sprays/day AM/Afternoon; Amidate form crosses blood brain best", itemType: "peptide", sortOrder: 2 },
  { categoryId: 2, name: "Semax Amidate 30MG", schedule: "2 sprays/day - see notes ->", duration: "90 days (Weekends off)", price: "85", defaultQty: 0, purpose: "Cognitive Energy", notes: "2-4 sprays/day AM/Afternoon; Amidate form crosses blood brain best", itemType: "peptide", sortOrder: 3 },
  { categoryId: 2, name: "Selank Amidate", schedule: "2 sprays/day - see notes ->", duration: "90 days (Weekends off)", price: "90", defaultQty: 0, purpose: "Cognitive Calming Energy", notes: "2-4 sprays/day AM/Afternoon; Amidate form crosses blood brain best", itemType: "peptide", sortOrder: 4 },
  { categoryId: 2, name: "Epitalon Capsules 3.3MG", schedule: "1 capsule before bed; or anytime", duration: "90 days (Weekends off)", price: "200", defaultQty: 1, purpose: "Longevity/Cellular telomeres", notes: "60 doses", itemType: "peptide", sortOrder: 5 },
  { categoryId: 2, name: "Tesofensine Capsules 250MCG", schedule: "AM, Every 2nd day", duration: "90 days", price: "146", defaultQty: 0, purpose: "Insane flow state, fasting support", notes: "30 capsules/bottle - upon wakeup until fat loss cycle is complete - NOTE: Contraindicated if on SSRI/SNRI", itemType: "peptide", sortOrder: 6 },
  { categoryId: 2, name: "Humanin 5MG", schedule: "", duration: "90 days (Weekends off)", price: "76", defaultQty: 0, purpose: "Neuroprotection, Inflammation, Oxidative Stress", notes: "Also supports Insulin Sensitivity, Glucose Metabolism, Cardiovascular Protection, Anti-Aging/Longevity", itemType: "peptide", sortOrder: 7 },
  { categoryId: 2, name: "NAD+ 500mg", schedule: "100-200mg 1-2x weekly", duration: "90 days (Weekends off)", price: "198", defaultQty: 0, purpose: "", notes: "", itemType: "peptide", sortOrder: 8 },
  { categoryId: 2, name: "DSIP (DeepSleepInducingPeptide) Nasal", schedule: "50-100mcg 1-3 hrs. before bedtime", duration: "90 days (Weekends off)", price: "58", defaultQty: 0, purpose: "", notes: "Will not make sleepy, but will enhance deep sleep. Timing is experimental.", itemType: "peptide", sortOrder: 9 },
  
  // Brain Restoration (categoryId: 3)
  { categoryId: 3, name: "Cerebrolysin", schedule: "5-10 mL Daily IM/Shallow IM", duration: "10-20 days straight", price: "20", defaultQty: 0, purpose: "Brain Regeneration; Cognition; TBI; Dementia; Alzheimers; Parkinsons; etc.", notes: "5 - 50mL / day 7-30 days; depending on condition", itemType: "peptide", sortOrder: 1 },
  { categoryId: 3, name: "Cortexin 10mg", schedule: "5MG/Day SubQ/Shallow IM", duration: "10 days straight (may repeat in 3-6 months)", price: "20", defaultQty: 0, purpose: "Brain Regeneration; Cognition; TBI; Dementia; Alzheimers; Parkinsons; etc.", notes: "5-10mg/day", itemType: "peptide", sortOrder: 2 },
  { categoryId: 3, name: "P-21 Nasal 25MG", schedule: "Experimental", duration: "", price: "200", defaultQty: 0, purpose: "Brain Regeneration; Cognition; Newer (less studied)", notes: "", itemType: "peptide", sortOrder: 3 },
  
  // Lean Muscle / Fat Loss / Hormone Support (categoryId: 4)
  { categoryId: 4, name: "Ipamorelin", schedule: "1x/night fasted @ bedtime", duration: "90 days (weekends off; 1 week off at 6 weeks)", price: "98", defaultQty: 0, purpose: "", notes: "", itemType: "peptide", sortOrder: 1 },
  { categoryId: 4, name: "Kisspeptin-10", schedule: "1x/day for Natural Hormone Boost", duration: "90 days (Weekends off)", price: "65", defaultQty: 1, purpose: "Testosterone/Estrogen Support", notes: "100mcg daily 3ML 6iu=100mcg", itemType: "peptide", sortOrder: 2 },
  { categoryId: 4, name: "Bromantane 5G + MG Scale", schedule: "1x/AM Mon-Fri (25-75mg)", duration: "90 days (Weekends off)", price: "117", defaultQty: 1, purpose: "Mental Focus/Preworkout/Flow", notes: "Start w/ 25mg-35mg; 3-5 days/week before exercise AM", itemType: "peptide", sortOrder: 3 },
  { categoryId: 4, name: "Bromantane 5G", schedule: "1x/AM Mon-Fri (25-75mg)", duration: "90 days (Weekends off)", price: "80", defaultQty: 0, purpose: "Mental Focus/Preworkout/Flow", notes: "Start w/ 25mg-35mg; 3-5 days/week before exercise AM", itemType: "peptide", sortOrder: 4 },
  { categoryId: 4, name: "Tesofensine Capsules 500mcg", schedule: "AM, Every 3rd day", duration: "60-90 days", price: "267", defaultQty: 0, purpose: "Insane flow state, fasting support", notes: "30 capsules/bottle - upon wakeup until fat loss cycle is complete - NOTE: Contraindicated if on SSRI/SNRI", itemType: "peptide", sortOrder: 5 },
  { categoryId: 4, name: "Tirzepatide HA 10MG", schedule: "1x/Week; 2.5MG/week then 3.33MG/Week", duration: "90 days", price: "325", defaultQty: 2, purpose: "Appetite Suppressant Dual GIP/GLP-1", notes: "50 MG will be 12 weeks, start at 2.5 and work up to 3.75/wk", itemType: "peptide", sortOrder: 6 },
  { categoryId: 4, name: "Retatrutide 12mg", schedule: "500-1000mcg/week micro-dose w/ Tirz", duration: "90 days", price: "220", defaultQty: 2, purpose: "Metabolism & Fat Burning Triple GLP-1/GIP/GCGR", notes: "Microdose for metabolism & Fat burning; combine w/ Tirz to avoid increased hunger", itemType: "peptide", sortOrder: 7 },
  { categoryId: 4, name: "AOD 9604 5MG", schedule: "1x/AM 300MCG fasted", duration: "Until Gone (Weekends off) - start after 2 weeks", price: "53", defaultQty: 0, purpose: "Body Composition/Fat Burning", notes: "Note: *must be mixed w/ 5ML", itemType: "peptide", sortOrder: 8 },
  { categoryId: 4, name: "5-Amino-1MQ Capsules 50MG", schedule: "1-3/day w/Food", duration: "90 days (Weekends off)", price: "273", defaultQty: 2, purpose: "Body Comp/Energy/Muscle Gain", notes: "1/day on non-workout day w/ meal. 2-3/day AM/Afternoon on workout days w/ meals", itemType: "peptide", sortOrder: 9 },
  { categoryId: 4, name: "SLU-PP-332 250mcg", schedule: "1-4 capsules daily split AM/PM", duration: "90 days (Weekends off)", price: "90", defaultQty: 0, purpose: "Weight loss, increase metabolism/fat burn, energy", notes: "", itemType: "peptide", sortOrder: 10 },
  { categoryId: 4, name: "MK-677 Ibutamoren", schedule: "10-25 drops at bedtime", duration: "90 days (Weekends off)", price: "73", defaultQty: 0, purpose: "Weight Gain; Muscle Gain/Hunger Increase (ghrelin)", notes: "Microdose for increasing hunger via the ghrelin receptor (GHS-R GH Secretagogue Receptor) Hunger Hormone", itemType: "peptide", sortOrder: 11 },
  
  // Immunity (categoryId: 5)
  { categoryId: 5, name: "Thymosin Alpha 1", schedule: "600mcg/day (AM or PM)", duration: "Until Gone (Weekends off)", price: "132", defaultQty: 0, purpose: "Immunity/Longevity/Viral", notes: "16 doses/vial", itemType: "peptide", sortOrder: 1 },
  { categoryId: 5, name: "Thymalin 100mg", schedule: "15iu = 5MG", duration: "Until Gone", price: "275", defaultQty: 0, purpose: "Immunity/Longevity/Detox/Heart Health", notes: "Naturally build up thymosin alpha 1 production, elongate telomeres", itemType: "peptide", sortOrder: 2 },
  { categoryId: 5, name: "LL-37", schedule: "125mcg/day (AM)", duration: "Until Gone (Weekends off)", price: "83", defaultQty: 0, purpose: "Immunity/Detox: Viral/Fungal/Bacterial", notes: "", itemType: "peptide", sortOrder: 3 },
  { categoryId: 5, name: "VIP (Nasal or Subq)", schedule: "2 sprays/day - see notes ->", duration: "90 days (Weekends off)", price: "78", defaultQty: 0, purpose: "Consider SubQ vs nasal", notes: "", itemType: "peptide", sortOrder: 4 },
  
  // Gut Health (categoryId: 6)
  { categoryId: 6, name: "Gastro Inflammation Formula", schedule: "3 capsules / day", duration: "30 days, break and repeat if needed", price: "270", defaultQty: 1, purpose: "Gut inflammation, healing & leaky gut/celiac", notes: "Contains 3 peptides in each capsule: BPC-157, KPV, Larazotide", itemType: "supplement", sortOrder: 1 },
  { categoryId: 6, name: "IP - Gut Feeling Formula", schedule: "1 scoop / day Link for purchase -->", duration: "30 days, repeat as needed", price: "165", defaultQty: 0, purpose: "Gut Restore w/ BPC, KPV, IP A2, Pro/Pre, and more", notes: "Code: omega10", affiliateUrl: "https://integrativepeptides.com/product/gut-feeling-mango-strawberry-flavor", affiliateCode: "omega10", itemType: "supplement", sortOrder: 2 },
  
  // Tinctures Anti-Aging (categoryId: 7)
  { categoryId: 7, name: "C60 (Carbon60) Tincture (Olive Oil Base)", schedule: "3/4 to 1 TSP in AM", duration: "90 days (Weekends off)", price: "55", defaultQty: 0, purpose: "Longevity/Recovery/Mitochondrial", notes: "Long term anti-aging; short term energy/recovery; 3 months", itemType: "supplement", sortOrder: 1 },
  { categoryId: 7, name: "Spermidine 3HCL Tincture", schedule: "1/2 ML dropper in AM", duration: "90 days (Weekends off)", price: "73", defaultQty: 3, purpose: "Longevity/Anti-Aging; Cellular Autophagy; Mitochondria Support", notes: "Long term anti-aging; short term energy/recovery; 2.5 months", itemType: "supplement", sortOrder: 2 },
  
  // Fun & Tanning (categoryId: 8)
  { categoryId: 8, name: "PT-141 10MG", schedule: "1-3mg, 1-5 hrs. before intimacy", duration: "as needed", price: "52", defaultQty: 2, purpose: "Fun... Feel 16 again (Side effects)", notes: "Trial for side effects - Can be taken up to 8x/month. 1.75mg is standard dosage", itemType: "peptide", sortOrder: 1 },
  { categoryId: 8, name: "Melanotan 1", schedule: "750mcg - 1.5mg 30 min. before sun", duration: "as needed", price: "50", defaultQty: 0, purpose: "", notes: "Has more profound meditation benefits but at small doses", itemType: "peptide", sortOrder: 2 },
  { categoryId: 8, name: "Melanotan 2 Spray", schedule: "4-8 sprays 1 hr.before sun; up to 2x/day", duration: "as needed", price: "77", defaultQty: 0, purpose: "Fun... Tanning Skin Quickly", notes: "Utilize if you like tanned skin. Also has some immunity and meditation benefits", itemType: "peptide", sortOrder: 3 },
  
  // Mitochondria Reboot Anti-Aging (categoryId: 9)
  { categoryId: 9, name: "SS-31 (Starter Protocol)", schedule: "4MG/Day; 25 straight days (100MG Protocol)", duration: "25 straight days", price: "70", defaultQty: 10, purpose: "Mitochondrial Anti-aging", notes: "Use PRIOR to MOTS-C; starter protocol; stronger protocol is 10mg/day for 20 straight days (200MG)", itemType: "peptide", sortOrder: 1 },
  { categoryId: 9, name: "SS-31 (Standard Protocol)", schedule: "10MG/Day; 20 straight days (200MG Protocol)", duration: "20 straight days", price: "70", defaultQty: 20, purpose: "Mitochondrial Anti-aging", notes: "Use PRIOR to MOTS-C; standard/stronger protocol is 10mg/day for 20 straight days (200MG)", itemType: "peptide", sortOrder: 2 },
  { categoryId: 9, name: "MOTS-C", schedule: "10MG/week in 2x5MG doses or 1x10MG", duration: "8 weeks (reconstitute and administer immediately)", price: "70", defaultQty: 8, purpose: "Mitochondrial Anti-aging", notes: "100 MG total needed; stronger protocol is 10 double this. Most conservative is 10MG once/week, or 3x/week for week 1-2, then 1/week after", itemType: "peptide", sortOrder: 3 },
  
  // Skin Anti-Aging (categoryId: 10)
  { categoryId: 10, name: "Copper Peptide Serum 1OZ", schedule: "Apply 1-2x/day before moisturizer", duration: "Long Term/As Needed", price: "70", defaultQty: 1, purpose: "Skin anti-aging", notes: "Women love this, but it has major healing properties and anti-aging face for men and women", itemType: "supplement", sortOrder: 1 },
  { categoryId: 10, name: "Copper Peptide Moisturizer", schedule: "Apply after Moisturizer", duration: "Long Term/As Needed", price: "97", defaultQty: 1, purpose: "Skin anti-aging", notes: "Women love this, but it has major healing properties and anti-aging face for men and women", itemType: "supplement", sortOrder: 2 },
  
  // BioRegulator Peptides (categoryId: 11)
  { categoryId: 11, name: "BioRegulator - Thyreogen", schedule: "2 capsules upon wakeup (or 45 min after thyroid)", duration: "10 days in a row, 20 day break; cycle again twice", price: "190", defaultQty: 1, purpose: "Thyroid", notes: "30 doses, only meant to take 1 cycle per year. All in 1 month, or 10 days per month for 3 months", itemType: "peptide", sortOrder: 1 },
  { categoryId: 11, name: "BioRegulator - Endoluten", schedule: "2 capsules before bed or anytime", duration: "10 days per month, 3 months straight", price: "235", defaultQty: 1, purpose: "Endocrine/Pineal", notes: "30 doses, only meant to take 1 cycle per year. All in 1 month, or 10 days per month for 3 months", itemType: "peptide", sortOrder: 2 },
  { categoryId: 11, name: "BioRegulator - Vladonix", schedule: "2 capsules upon wakeup (or 45 min after thyroid)", duration: "10 days per month, 3 months straight", price: "190", defaultQty: 1, purpose: "Thymus", notes: "30 doses, only meant to take 1 cycle per year. All in 1 month, or 10 days per month for 3 months", itemType: "peptide", sortOrder: 3 },
  { categoryId: 11, name: "BioRegulator - Sigumir", schedule: "2 capsules upon wakeup (or 45 min after thyroid)", duration: "10 days per month, 3 months straight", price: "190", defaultQty: 1, purpose: "Cartilage", notes: "30 doses, only meant to take 1 cycle per year. All in 1 month, or 10 days per month for 3 months", itemType: "peptide", sortOrder: 4 },
  { categoryId: 11, name: "BioRegulator - Cerluten", schedule: "2 capsules upon wakeup (or 45 min after thyroid)", duration: "10 days per month, 3 months straight", price: "190", defaultQty: 1, purpose: "Brain", notes: "30 doses, only meant to take 1 cycle per year. All in 1 month, or 10 days per month for 3 months", itemType: "peptide", sortOrder: 5 },
  { categoryId: 11, name: "BioRegulator - Libidon", schedule: "2 capsules upon wakeup (or 45 min after thyroid)", duration: "10 days per month, 3 months straight", price: "190", defaultQty: 1, purpose: "Prostate", notes: "30 doses, only meant to take 1 cycle per year. All in 1 month, or 10 days per month for 3 months", itemType: "peptide", sortOrder: 6 },
  { categoryId: 11, name: "BioRegulator - Glandokort", schedule: "2 capsules upon wakeup (or 45 min after thyroid)", duration: "10 days per month, 3 months straight", price: "190", defaultQty: 1, purpose: "Adrenal", notes: "30 doses, only meant to take 1 cycle per year. All in 1 month, or 10 days per month for 3 months", itemType: "peptide", sortOrder: 7 },
  { categoryId: 11, name: "BioRegulator - Vesugen", schedule: "2 capsules upon wakeup (or 45 min after thyroid)", duration: "10 days per month, 3 months straight", price: "190", defaultQty: 1, purpose: "Blood vessels", notes: "30 doses, only meant to take 1 cycle per year. All in 1 month, or 10 days per month for 3 months", itemType: "peptide", sortOrder: 8 },
  { categoryId: 11, name: "BioRegulator - Svetinorm", schedule: "2 capsules upon wakeup (or 45 min after thyroid)", duration: "10 days per month, 3 months straight", price: "190", defaultQty: 1, purpose: "Liver", notes: "30 doses, only meant to take 1 cycle per year. All in 1 month, or 10 days per month for 3 months", itemType: "peptide", sortOrder: 9 },
  { categoryId: 11, name: "BioRegulator - Gotratix", schedule: "2 capsules upon wakeup (or 45 min after thyroid)", duration: "10 days per month, 3 months straight", price: "190", defaultQty: 1, purpose: "Muscle", notes: "30 doses, only meant to take 1 cycle per year. All in 1 month, or 10 days per month for 3 months", itemType: "peptide", sortOrder: 10 },
  
  // Adjuncts (categoryId: 12)
  { categoryId: 12, name: "Troscriptions Tro+ Methylene Blue", schedule: "See PDF, as needed", duration: "as needed", price: "40", defaultQty: 1, purpose: "Flow, Immune, Inflammation, etc.", notes: "Not a peptide, this is the nootropic that will turn your mouth blue :)", affiliateUrl: "https://example.com/affiliate/troscriptions", itemType: "supplement", sortOrder: 1 },
  { categoryId: 12, name: "Troscriptions Blue Cannatine", schedule: "See PDF, as needed", duration: "as needed", price: "34", defaultQty: 1, purpose: "Cognitive Energy", notes: "Great addition for mental energy", affiliateUrl: "https://example.com/affiliate/troscriptions", itemType: "supplement", sortOrder: 2 },
  { categoryId: 12, name: "Troscriptions ZZZ Sleep Troche", schedule: "See PDF, as needed", duration: "as needed", price: "34", defaultQty: 0, purpose: "Sleep", notes: "Best natural sleep combination we have ever seen", affiliateUrl: "https://example.com/affiliate/troscriptions", itemType: "supplement", sortOrder: 3 },
  { categoryId: 12, name: "Troscriptions TroCalm GABA Troche", schedule: "See PDF, as needed", duration: "as needed", price: "34", defaultQty: 0, purpose: "Calm/Anxiety", notes: "Best alternative to medications like Valium and Xanax", affiliateUrl: "https://example.com/affiliate/troscriptions", itemType: "supplement", sortOrder: 4 },
  { categoryId: 12, name: "Troscriptions TroMune Immune Troche", schedule: "See PDF, as needed", duration: "as needed", price: "34", defaultQty: 0, purpose: "Immunity", notes: "Cordyceps extracted immunity; also aids deep sleep", affiliateUrl: "https://example.com/affiliate/troscriptions", itemType: "supplement", sortOrder: 5 },
  { categoryId: 12, name: "BiOptimizers Mushroom Breakthrough", schedule: "See PDF, as needed", duration: "as needed", price: "65", defaultQty: 0, purpose: "Energy/Stress", notes: "Favorite Mushroom powder to add to smoothies", affiliateUrl: "https://example.com/affiliate/bioptimizers", itemType: "supplement", sortOrder: 6 },
  { categoryId: 12, name: "BiOptimizers MicroBiome Breakthrough", schedule: "See PDF, as needed", duration: "Until Gone", price: "75", defaultQty: 0, purpose: "Gut Repair", notes: "Leaky gut repair to go alongside Gastro Inflammation Formula (above)", affiliateUrl: "https://example.com/affiliate/bioptimizers", itemType: "supplement", sortOrder: 7 },
  { categoryId: 12, name: "Magnesium Breakthrough", schedule: "4/night", duration: "90 days", price: "34", defaultQty: 6, purpose: "Tirz Support", notes: "Tirz support 90 days", affiliateUrl: "https://example.com/affiliate/bioptimizers", itemType: "supplement", sortOrder: 8 },
  { categoryId: 12, name: "HealthForce Intestinal Formula", schedule: "1-2/day", duration: "90 days", price: "34", defaultQty: 2, purpose: "Tirz Support", notes: "Tirz support 90 days", affiliateUrl: "https://example.com/affiliate/healthforce", itemType: "supplement", sortOrder: 9 },
  
  // Supplies (categoryId: 13)
  { categoryId: 13, name: "Peptide Injector Pens + Tips + Cartridges", schedule: "", duration: "", price: "55", defaultQty: 0, purpose: "", notes: "", itemType: "supply", sortOrder: 1 },
  { categoryId: 13, name: "Nasal Sprayer + Deionized Water", schedule: "For Nasal Reconstitutions", duration: "", price: "6", defaultQty: 1, purpose: "", notes: "", itemType: "supply", sortOrder: 2 },
  { categoryId: 13, name: ".5 ML 31G syringe qty 100", schedule: "For peptides", duration: "", price: "20", defaultQty: 1, purpose: "Daily use", notes: "", itemType: "supply", sortOrder: 3 },
  { categoryId: 13, name: "2ML 23G qty 20", schedule: "For reconstitution", duration: "", price: "13", defaultQty: 1, purpose: "Reconstitution only", notes: "", itemType: "supply", sortOrder: 4 },
  { categoryId: 13, name: "Alcohol Wipes", schedule: "For Sanitation", duration: "", price: "5", defaultQty: 1, purpose: "", notes: "", itemType: "supply", sortOrder: 5 },
  { categoryId: 13, name: "Reconstitution Solution", schedule: "", duration: "", price: "16", defaultQty: 1, purpose: "", notes: "", itemType: "supply", sortOrder: 6 },
  { categoryId: 13, name: "Order & Consolidation, Reship costs", schedule: "Complete preparation & reshipment after labeled", duration: "", price: "150", defaultQty: 1, purpose: "", notes: "", itemType: "supply", sortOrder: 7 },
  
  // Services (categoryId: 14)
  { categoryId: 14, name: "Transformation 90 Day Protocol", schedule: "Includes all Labeling and virtual reconstitution", duration: "", price: "2500", defaultQty: 1, purpose: "", notes: "Coaching protocol build, virtual session & ongoing coaching support for duration", itemType: "service", sortOrder: 1 },
];

const requirements = [
  { text: "Limit alcohol & sugar as much as possible (anti-inflammatory)", isDefault: true, sortOrder: 1 },
  { text: "Eat Target Goal Body Weight in Grams of Protein per day (e.g. if weigh 250 lbs. but goal is 220 lbs, eat 220 Grams Protein/day)", isDefault: true, sortOrder: 2 },
  { text: "Drink body weight in OZ of water per day minimum", isDefault: true, sortOrder: 3 },
  { text: "Add electrolytes while fasting and/or in heat and/or pre/post workouts", isDefault: true, sortOrder: 4 },
  { text: "Add a highly absorbable version of turmeric/curcumin to supplements if not already present - as well as Fish oil/Omega 3's for joints (or Prodrome)", isDefault: true, sortOrder: 5 },
];

async function seed() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    console.log('Seeding categories...');
    for (const cat of categories) {
      await connection.execute(
        'INSERT INTO categories (name, description, sortOrder) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description), sortOrder = VALUES(sortOrder)',
        [cat.name, cat.description, cat.sortOrder]
      );
    }
    console.log(`Inserted ${categories.length} categories`);
    
    console.log('Seeding protocol items...');
    for (const item of protocolItems) {
      await connection.execute(
        `INSERT INTO protocol_items (categoryId, name, schedule, duration, price, defaultQty, purpose, notes, affiliateUrl, affiliateCode, itemType, sortOrder) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE schedule = VALUES(schedule), duration = VALUES(duration), price = VALUES(price), defaultQty = VALUES(defaultQty), purpose = VALUES(purpose), notes = VALUES(notes), affiliateUrl = VALUES(affiliateUrl), affiliateCode = VALUES(affiliateCode), itemType = VALUES(itemType), sortOrder = VALUES(sortOrder)`,
        [item.categoryId, item.name, item.schedule || null, item.duration || null, item.price || '0', item.defaultQty || 0, item.purpose || null, item.notes || null, item.affiliateUrl || null, item.affiliateCode || null, item.itemType || 'peptide', item.sortOrder || 0]
      );
    }
    console.log(`Inserted ${protocolItems.length} protocol items`);
    
    console.log('Seeding requirements...');
    for (const req of requirements) {
      await connection.execute(
        'INSERT INTO protocol_requirements (text, isDefault, sortOrder) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE isDefault = VALUES(isDefault), sortOrder = VALUES(sortOrder)',
        [req.text, req.isDefault, req.sortOrder]
      );
    }
    console.log(`Inserted ${requirements.length} requirements`);
    
    // Create default template
    console.log('Creating default template...');
    await connection.execute(
      'INSERT INTO templates (name, description, durationMonths, isDefault) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description)',
      ['Master Template', 'Default master template with all protocol items', 3, true]
    );
    
    // Get template ID
    const [templatesResult] = await connection.execute('SELECT id FROM templates WHERE name = ?', ['Master Template']);
    const templateId = templatesResult[0]?.id;
    
    if (templateId) {
      // Get all protocol items and add to template
      const [items] = await connection.execute('SELECT id, defaultQty FROM protocol_items WHERE defaultQty > 0');
      for (const item of items) {
        await connection.execute(
          'INSERT INTO template_items (templateId, protocolItemId, quantity, isRecommended, sortOrder) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)',
          [templateId, item.id, item.defaultQty, true, 0]
        );
      }
      console.log(`Added ${items.length} items to default template`);
    }
    
    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seed();

/**
 * Rotating peptide facts for the homepage banner.
 * Each fact highlights a cool thing about a specific peptide.
 */

export interface PeptideFact {
  peptide: string;
  fact: string;
  emoji: string;
}

export const peptideFacts: PeptideFact[] = [
  {
    peptide: "BPC-157",
    fact: "Originally discovered in gastric juice, BPC-157 has been shown in studies to accelerate healing of tendons, ligaments, and gut tissue — earning it the nickname \"The Wolverine Peptide.\"",
    emoji: "🧬",
  },
  {
    peptide: "TB-500",
    fact: "Thymosin Beta-4 is naturally produced in your thymus gland and plays a critical role in tissue repair, new blood vessel formation, and reducing inflammation throughout the body.",
    emoji: "🔬",
  },
  {
    peptide: "GHK-Cu",
    fact: "This copper peptide naturally declines with age — at 20 you have 200 ng/mL, but by 60 only 80 ng/mL. Restoring it has been linked to skin remodeling, wound healing, and even hair regrowth.",
    emoji: "✨",
  },
  {
    peptide: "GLP-1 Agonists",
    fact: "GLP-1 peptides like Tirzepatide don't just suppress appetite — they improve insulin sensitivity, reduce cardiovascular risk markers, and are reshaping the future of metabolic health.",
    emoji: "⚡",
  },
  {
    peptide: "NAD+",
    fact: "NAD+ levels decline by roughly 50% between ages 40 and 60. Restoring NAD+ has been shown to support mitochondrial function, DNA repair, and cellular energy production.",
    emoji: "🔋",
  },
  {
    peptide: "Semax",
    fact: "Developed by the Russian Academy of Sciences, Semax is a nootropic peptide that enhances BDNF (brain-derived neurotrophic factor), supporting memory, focus, and neuroprotection.",
    emoji: "🧠",
  },
  {
    peptide: "Selank",
    fact: "Selank is an anxiolytic peptide that modulates IL-6 and influences the balance of T-helper cell cytokines — offering both immune support and mood stabilization without sedation.",
    emoji: "🛡️",
  },
  {
    peptide: "Thymosin Alpha 1",
    fact: "Used in over 35 countries for immune modulation, Thymosin Alpha 1 enhances dendritic cell function and T-cell maturation — making it a cornerstone of immune optimization protocols.",
    emoji: "💪",
  },
  {
    peptide: "Khavinson Bioregulators",
    fact: "Discovered by Dr. Vladimir Khavinson through 40+ years of research, these short peptides target specific organs — Epithalon for the pineal gland, Vilon for the thymus — to restore youthful function.",
    emoji: "🏛️",
  },
  {
    peptide: "Klotho",
    fact: "Named after the Greek goddess who spins the thread of life, Klotho protein declines with age and its restoration has been linked to improved cognition, kidney function, and longevity.",
    emoji: "🌟",
  },
];

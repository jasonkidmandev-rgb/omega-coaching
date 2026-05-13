/**
 * Shared live stats calculations used across the homepage and transformation page.
 * Single source of truth — edit here to update everywhere.
 */

export function getClientsTransformed(): number {
  // Base: 312 clients as of Feb 2, 2026
  // Growth: 2-3 per week, spread across days (~0.36/day average)
  const baseDate = new Date('2026-02-02');
  const baseCount = 312;
  const now = new Date();
  const daysSinceBase = Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const dailyVariation = (dayOfYear % 3 === 0) ? 1 : 0;
  const weeklyGrowth = Math.floor(daysSinceBase / 7) * 2.5;
  const dailyGrowth = Math.floor((daysSinceBase % 7) * 0.36);
  return Math.floor(baseCount + weeklyGrowth + dailyGrowth + dailyVariation);
}

export function getProtocolsCreated(): number {
  // Base: 2,032 protocols as of Feb 2, 2026
  // Growth: 4-6 per week, spread across days (~0.71/day average)
  const baseDate = new Date('2026-02-02');
  const baseCount = 2032;
  const now = new Date();
  const daysSinceBase = Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const dailyVariation = (dayOfYear % 2 === 0) ? 1 : 0;
  const weeklyGrowth = Math.floor(daysSinceBase / 7) * 5;
  const dailyGrowth = Math.floor((daysSinceBase % 7) * 0.71);
  return Math.floor(baseCount + weeklyGrowth + dailyGrowth + dailyVariation);
}

export function getYearsExperience(): number {
  // Started peptide journey in 2018 (now in 8th year)
  const startYear = 2018;
  const now = new Date();
  return now.getFullYear() - startYear;
}

export function getPeptidesResearched(): number {
  // 50+ peptides researched and growing
  return 50;
}

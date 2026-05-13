/**
 * FAQ data for the homepage.
 * Answers are succinct, create curiosity, and use good marketing language.
 */

export interface FAQItem {
  question: string;
  answer: string;
}

export const faqItems: FAQItem[] = [
  {
    question: "What exactly is peptide coaching?",
    answer: "Peptide coaching is personalized guidance on using research-backed peptides to achieve specific health goals — whether that's fat loss, muscle recovery, anti-aging, or cognitive enhancement. Unlike generic online advice, a coach designs a protocol tailored to your body, your labs, and your lifestyle. Think of it as having a GPS instead of a paper map.",
  },
  {
    question: "Are peptides safe?",
    answer: "Many peptides like BPC-157, Thymosin Alpha 1, and GHK-Cu are naturally produced by your own body — they decline with age. When sourced from reputable suppliers and used under proper guidance, peptides have an excellent safety profile backed by decades of research. That said, working with a knowledgeable coach is the difference between guessing and knowing.",
  },
  {
    question: "Do I need a prescription?",
    answer: "Most research peptides do not require a prescription. However, certain compounds like Tirzepatide and Semaglutide may require a prescription depending on your state. During your consultation, we'll clarify exactly what applies to your situation and connect you with the right sourcing options.",
  },
  {
    question: "How is this different from what I find on Reddit or YouTube?",
    answer: "The internet is full of conflicting information, bro-science dosing, and outdated protocols. Working with a coach means you get a protocol built on clinical research, real-world client data from hundreds of successful transformations, and ongoing adjustments based on how YOUR body responds — not someone else's anecdote.",
  },
  {
    question: "What results can I expect?",
    answer: "Results depend on your goals, commitment, and protocol. Our clients have lost 15-30 lbs in 60-90 days, reversed pre-diabetic markers, dramatically improved energy and sleep, and achieved body composition changes they couldn't get from diet and exercise alone. Your consultation will set realistic expectations based on your specific situation.",
  },
  {
    question: "What does the $95 Discovery Session include?",
    answer: "You get a focused 20-minute session where we assess your goals, review your current health picture, and recommend the right coaching plan for you. The $95 is a deposit — if you enroll in a coaching plan within 24 hours, it's applied toward your program cost. It's designed for people who are ready to take action, not just browse.",
  },
  {
    question: "I'm completely new to peptides. Is this for me?",
    answer: "Absolutely — in fact, beginners benefit the most from coaching. Starting with expert guidance means you avoid common mistakes, choose the right peptides for your goals, learn proper reconstitution and dosing, and get results faster. Our Masterclass library alone covers everything from fundamentals to advanced protocols.",
  },
  {
    question: "How long until I see results?",
    answer: "Many clients notice changes within the first 2-3 weeks — improved sleep, reduced inflammation, and increased energy are often the first signs. Significant body composition and health marker changes typically emerge between weeks 4-8. The key is consistency and having a protocol that's actually designed for your biology.",
  },
];

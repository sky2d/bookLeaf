import "server-only";

export const DRAFT_SYSTEM_INSTRUCTION = `
You are a Senior Author Support Specialist writing on behalf of "Team BookLeaf Author Support" at BookLeaf Publishing.
Your mission is to craft an empathetic, courteous, professional, and completely accurate response to an author's support ticket.

### Tone & Communication Principles
1. **Empathy & Respect**: Authors are creators who deeply care about their books. Always acknowledge their situation, feelings, and questions first with warmth and understanding before explaining policy or mechanics.
2. **Strict Grounding (Zero Hallucination)**:
   - Quote ONLY the exact numbers, monetary figures, dates, and statuses provided in the "Ground-Truth Facts" and "BookLeaf Knowledge Base".
   - NEVER calculate or invent numbers, payout amounts, percentages, or dates.
   - NEVER promise policy exceptions or unauthorized discounts.
3. **Actionable Resolution**: Provide clear, unambiguous next steps and timelines based strictly on the provided policy:
   - Royalty questions: State the exact pending balance, explain whether it meets the ₹1,000 threshold or rolls over, and cite the scheduled payout date.
   - ISBN & Metadata: State that minor metadata changes reflect in 24–48 hours without changing the ISBN, or escalate within 48 hours for discrepancies.
   - Printing & Quality: Express genuine regret, request 2–3 clear photos showing the defect and packaging, and confirm that verified replacements are dispatched within 5–7 business days at no cost.
   - Distribution: Explain Print-on-Demand (POD) permanent availability and inventory re-indexing timelines (24–48 hours).
   - Production: Cite the current stage in the 9-stage pipeline and next milestone.
4. **Sign-off**: Always close with:
Warm regards,
Team BookLeaf Author Support

### Output Format
- Write the direct, complete message body ready to be sent to the author.
- Do NOT include subject lines, markdown code blocks, or preamble comments (like "Here is a draft response:").
- Address the author by their first name (e.g., "Dear Priya,").
`.trim();

export interface DraftPromptMessage {
  senderRole: "AUTHOR" | "ADMIN";
  senderName: string;
  body: string;
  createdAt: string;
}

export interface BuildDraftPromptParams {
  authorName: string;
  ticketSubject: string;
  kbContext: string;
  factsBlock: string;
  messages: DraftPromptMessage[];
}

/**
 * Builds the complete prompt for Gemini to draft a support response.
 */
export function buildDraftPrompt(params: BuildDraftPromptParams): string {
  const parts: string[] = [
    "### Applicable Knowledge Base Policy",
    params.kbContext,
    "",
    params.factsBlock,
    "",
    "### Support Ticket Information",
    `- Author: ${params.authorName}`,
    `- Ticket Subject: "${params.ticketSubject}"`,
    "",
    "### Conversation Thread History (Chronological)",
  ];

  if (params.messages.length === 0) {
    parts.push("(No messages in thread yet. Respond to the ticket subject and initial inquiry.)");
  } else {
    for (const msg of params.messages) {
      const roleLabel = msg.senderRole === "ADMIN" ? "Support Team" : "Author";
      parts.push(`[${roleLabel} - ${msg.senderName} (${msg.createdAt})]:\n${msg.body}\n`);
    }
  }

  parts.push("");
  parts.push(
    "### Instruction\nDraft the next response from Team BookLeaf Author Support to the author. Follow all Tone, Grounding, and Policy rules strictly.",
  );

  return parts.join("\n");
}

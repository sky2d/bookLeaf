import "dotenv/config";
import { generateWithRetry, getDefaultModel, isAiEnabled } from "@/server/ai/client";
import { logAiCall } from "@/server/ai/usage";

async function main() {
  console.log("== BookLeaf AI Health Ping ==");

  if (!isAiEnabled()) {
    console.log("⚠️  AI service is disabled or GEMINI_API_KEY is not configured.");
    if (process.env.AI_FORCE_FAIL === "true") {
      console.log("Reason: AI_FORCE_FAIL is set to 'true'.");
    } else {
      console.log("Reason: GEMINI_API_KEY environment variable is missing.");
    }
    process.exit(0);
  }

  const model = getDefaultModel();
  console.log(`Model: ${model}`);
  console.log("Sending ping request...");

  const startTime = Date.now();
  let ok = false;
  let latencyMs = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let errorCode: string | null = null;
  let replyText = "";

  try {
    const response = await generateWithRetry(async (ai) => {
      return await ai.models.generateContent({
        model,
        contents: "Reply with 'PONG'",
      });
    });

    latencyMs = Date.now() - startTime;
    ok = true;
    replyText = response.text?.trim() || "";
    inputTokens = response.usageMetadata?.promptTokenCount || 0;
    outputTokens = response.usageMetadata?.candidatesTokenCount || 0;

    console.log(`✔ Received response in ${latencyMs}ms: "${replyText}"`);
    console.log(
      `Tokens: ${inputTokens} input, ${outputTokens} output, ${response.usageMetadata?.totalTokenCount || 0} total`,
    );
  } catch (err: unknown) {
    latencyMs = Date.now() - startTime;
    ok = false;
    errorCode = err instanceof Error ? err.message : String(err);
    console.error(`✘ AI call failed after ${latencyMs}ms:`, errorCode);
  }

  // Record to AiCall table
  try {
    await logAiCall({
      purpose: "CLASSIFY",
      model,
      inputTokens,
      outputTokens,
      latencyMs,
      ok,
      errorCode,
    });
    console.log("✔ Logged telemetry to AiCall table in database.");
  } catch (logErr) {
    console.error("Failed to log telemetry to AiCall table:", logErr);
  }

  if (!ok) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

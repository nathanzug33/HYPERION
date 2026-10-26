import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireStaff } from "@/lib/guards";
import { describeAnthropicError } from "@/lib/ai-dc";
import { AGENT_TOOLS, executeAgentTool } from "@/lib/agent/tools";
import { buildAgentSystemPrompt } from "@/lib/agent/system-prompt";

export const dynamic = "force-dynamic";

const MAX_TOOL_TURNS = 6;
const MAX_HISTORY_MESSAGES = 20;

type ChatMessage = { role: "user" | "assistant"; content: string };

function isChatMessage(v: unknown): v is ChatMessage {
  if (typeof v !== "object" || v === null) return false;
  const role = (v as Record<string, unknown>).role;
  const content = (v as Record<string, unknown>).content;
  return (role === "user" || role === "assistant") && typeof content === "string";
}

export async function POST(request: Request) {
  const session = await requireStaff();

  let body: { messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const history = Array.isArray(body.messages) ? body.messages.filter(isChatMessage) : [];
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "Message manquant." }, { status: 400 });
  }

  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  const client = new Anthropic(
    workspaceId ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } } : undefined
  );

  const messages: Anthropic.MessageParam[] = history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content }));

  let pendingAction: Record<string, unknown> | null = null;
  let finalText = "";

  try {
    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const response = await client.messages.create({
        model: "claude-opus-5",
        max_tokens: 2048,
        system: buildAgentSystemPrompt(session.user),
        tools: AGENT_TOOLS,
        messages,
      });

      messages.push({ role: "assistant", content: response.content });

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      if (toolUses.length === 0) {
        finalText = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        break;
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        let result: unknown;
        try {
          result = await executeAgentTool(tu.name, tu.input, session.user);
        } catch (err) {
          result = { ok: false, erreur: err instanceof Error ? err.message : "Erreur inattendue." };
        }
        if (
          tu.name === "preparer_push_candidat" &&
          result !== null &&
          typeof result === "object" &&
          (result as { ok?: boolean }).ok
        ) {
          pendingAction = { type: "push_candidat", ...(result as Record<string, unknown>) };
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: JSON.stringify(result),
        });
      }
      messages.push({ role: "user", content: toolResults });

      if (turn === MAX_TOOL_TURNS - 1) {
        finalText =
          response.content
            .filter((b): b is Anthropic.TextBlock => b.type === "text")
            .map((b) => b.text)
            .join("\n")
            .trim() || "Je n'ai pas réussi à terminer cette demande — peux-tu reformuler ?";
      }
    }
  } catch (err) {
    return NextResponse.json({ error: describeAnthropicError(err) }, { status: 502 });
  }

  return NextResponse.json({ reply: finalText || "…", pendingAction });
}

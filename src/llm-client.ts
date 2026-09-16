export type Provider = 'openai' | 'anthropic' | 'openrouter';

export interface CallParams {
  provider: Provider;
  apiKey: string;
  model: string;
  prompt: string;
}

export interface SummarizeParams {
  provider: Provider;
  apiKey: string;
  model: string;
  threadText: string; // already stripped/truncated plain text
}

export interface ComposeReplyParams {
  provider: Provider;
  apiKey: string;
  model: string;
  threadText: string; // already stripped/truncated plain text
  userInput: string; // the user's rough notes on what they want to say
}

const SUMMARIZE_PROMPT_PREFIX = `Summarize the following email thread in 3-6 short bullet points.
Focus on: key points discussed, any decisions made, and any open
action items or unanswered questions. Be terse — this is for someone
who has already read the thread and wants a quick refresher.

THREAD:
`;

export async function summarizeThread(params: SummarizeParams): Promise<string> {
  const { provider, apiKey, model, threadText } = params;
  return callLLM({ provider, apiKey, model, prompt: SUMMARIZE_PROMPT_PREFIX + threadText });
}

export async function composeReply(params: ComposeReplyParams): Promise<string> {
  const { provider, apiKey, model, threadText, userInput } = params;
  const prompt = `You are drafting a reply to the email thread below, on behalf of the
person who received it. Use the thread for context (who's involved, what's
been discussed, any open questions) so the reply makes sense as a follow-up.

The person wants to say the following (their rough notes, possibly informal
or incomplete — rephrase and expand this into a polished, appropriately
toned reply body, but keep their intent and key points; don't invent new
facts, commitments, or details that weren't in their notes or the thread):

USER'S NOTES:
${userInput}

THREAD:
${threadText}

Write ONLY the body text of the reply email. No subject line, no
"Here's a draft" preamble, no explanation — just the reply text itself,
ready to send.`;

  return callLLM({ provider, apiKey, model, prompt });
}

export async function callLLM(params: CallParams): Promise<string> {
  const { provider, apiKey, model, prompt } = params;
  if (!apiKey) {
    throw new Error(`No API key configured for ${provider}. Set one in Preferences > AI Thread Sidebar.`);
  }

  if (provider === 'openai') {
    return callOpenAI(apiKey, model, prompt);
  }
  if (provider === 'anthropic') {
    return callAnthropic(apiKey, model, prompt);
  }
  if (provider === 'openrouter') {
    return callOpenRouter(apiKey, model, prompt);
  }
  throw new Error(`Unknown provider: ${provider}`);
}

async function callOpenAI(apiKey: string, model: string, prompt: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (err) {
    throw new Error(`Network error contacting OpenAI: ${(err as Error).message}`);
  }

  if (!response.ok) {
    const detail = await safeErrorDetail(response);
    throw new Error(`OpenAI request failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('OpenAI response did not contain any text.');
  }
  return content.trim();
}

async function callAnthropic(apiKey: string, model: string, prompt: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (err) {
    throw new Error(`Network error contacting Anthropic: ${(err as Error).message}`);
  }

  if (!response.ok) {
    const detail = await safeErrorDetail(response);
    throw new Error(`Anthropic request failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const content = data?.content?.[0]?.text;
  if (!content || typeof content !== 'string') {
    throw new Error('Anthropic response did not contain any text.');
  }
  return content.trim();
}

async function callOpenRouter(apiKey: string, model: string, prompt: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (err) {
    throw new Error(`Network error contacting OpenRouter: ${(err as Error).message}`);
  }

  if (!response.ok) {
    const detail = await safeErrorDetail(response);
    throw new Error(`OpenRouter request failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('OpenRouter response did not contain any text.');
  }
  return content.trim();
}

async function safeErrorDetail(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body?.error?.message || JSON.stringify(body);
  } catch {
    try {
      return await response.text();
    } catch {
      return response.statusText || 'unknown error';
    }
  }
}

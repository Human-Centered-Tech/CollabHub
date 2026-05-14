import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface SummaryPayload {
  overview: string;
  authorNote: string;
  pros: string[];
  cons: string[];
  watchOuts: string[];
}

export interface SummaryInput {
  repoFullName: string;
  prNumber: number;
  prTitle: string;
  prBody: string;
  author: string;
  diff: string;
}

const SYSTEM_PROMPT = `You are CollabHub, an experienced staff engineer who writes concise, opinionated PR reviews for engineering teams. You read a unified diff and produce a structured summary covering: what the author did, design pros, design cons, and reviewer watch-outs. You are direct but kind. Avoid restating the obvious. Focus on design, architecture, correctness, security, and maintainability — not style nits.

Always respond with a single JSON object matching this TypeScript type and nothing else:

interface Output {
  overview: string;            // 2-4 sentences in plain language describing what the author changed and why it looks like they did it
  authorNote: string;          // A short note (1-2 sentences) addressed to the author about what stood out
  pros: string[];              // 1-4 design strengths
  cons: string[];              // 1-4 design risks or weaknesses (empty array if none)
  watchOuts: string[];         // 1-4 specific things reviewers should be mindful of (empty array if none)
}

Each list item should be a single sentence. Do not use markdown formatting inside JSON strings. Do not wrap your response in code fences.`;

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY') ?? '';
    this.model =
      config.get<string>('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-6';
    this.client = new Anthropic({ apiKey });
  }

  async summarize(input: SummaryInput): Promise<SummaryPayload> {
    const truncatedDiff = this.truncateDiff(input.diff, 60000);
    const userMessage = [
      `Repository: ${input.repoFullName}`,
      `Pull request #${input.prNumber}: ${input.prTitle}`,
      `Author: @${input.author}`,
      '',
      'PR description:',
      input.prBody?.trim() ? input.prBody : '(no description provided)',
      '',
      'Unified diff:',
      '```diff',
      truncatedDiff,
      '```',
    ].join('\n');

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n')
      .trim();

    return this.parseResponse(text);
  }

  modelName(): string {
    return this.model;
  }

  private parseResponse(text: string): SummaryPayload {
    let payload: any;
    try {
      payload = JSON.parse(text);
    } catch {
      // Strip fences if the model ignored instructions.
      const cleaned = text
        .replace(/^```(?:json)?/i, '')
        .replace(/```$/i, '')
        .trim();
      payload = JSON.parse(cleaned);
    }
    return {
      overview: String(payload.overview ?? '').trim(),
      authorNote: String(payload.authorNote ?? '').trim(),
      pros: Array.isArray(payload.pros) ? payload.pros.map(String) : [],
      cons: Array.isArray(payload.cons) ? payload.cons.map(String) : [],
      watchOuts: Array.isArray(payload.watchOuts)
        ? payload.watchOuts.map(String)
        : [],
    };
  }

  private truncateDiff(diff: string, max: number): string {
    if (diff.length <= max) return diff;
    return (
      diff.slice(0, max) +
      `\n\n[diff truncated — ${diff.length - max} bytes omitted]`
    );
  }
}

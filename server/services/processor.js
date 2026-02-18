const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

const CATEGORIES = [
  'Email Campaign',
  'Help Article / FAQ',
  'Policy Document',
  'Marketing Copy',
  'Internal Communication',
  'Meeting Notes',
  'Product Documentation',
  'Blog Post / Article',
  'Customer Communication',
  'Legal / Compliance',
];

const SYSTEM_PROMPT = `You are processing documents for a knowledge base. For each document provided:

1. Classify the document type from this list: ${CATEGORIES.join(', ')}, or suggest a new category if none fit.
2. Break it into logical chunks of 500-800 tokens, respecting natural boundaries (sections, paragraphs, topic shifts). Rules:
   - Never break mid-sentence
   - Keep related content together (a question and its answer should be one chunk)
   - If a document is under 800 tokens, keep it as a single chunk
3. For each chunk, provide:
   - title: A clear descriptive title (not the filename)
   - content: The exact chunk text from the document
   - summary: 1-2 sentence summary
   - tags: 3-5 relevant topic tags
   - category: The document classification

Respond in JSON format only. No preamble, no markdown code fences, just raw JSON.

{
  "document_type": "string",
  "chunks": [
    {
      "title": "string",
      "content": "string",
      "summary": "string",
      "tags": ["string"],
      "category": "string"
    }
  ]
}`;

const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 8000];

async function processDocument(rawText, filename) {
  const userMessage = `Document filename: ${filename}\n\nDocument content:\n${rawText}`;

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        messages: [
          { role: 'user', content: userMessage },
        ],
        system: SYSTEM_PROMPT,
      });

      const text = response.content[0].text;

      // Parse the JSON response — handle potential markdown fences
      let jsonStr = text.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const result = JSON.parse(jsonStr);

      // Validate structure
      if (!result.chunks || !Array.isArray(result.chunks) || result.chunks.length === 0) {
        throw new Error('AI response missing chunks array');
      }

      for (const chunk of result.chunks) {
        if (!chunk.title || !chunk.content || !chunk.summary || !chunk.category) {
          throw new Error('AI response chunk missing required fields');
        }
        if (!Array.isArray(chunk.tags)) {
          chunk.tags = [];
        }
      }

      return result;
    } catch (err) {
      lastError = err;
      console.error(`Process attempt ${attempt + 1} failed for "${filename}":`, err.message);

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt];
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw new Error(`Processing failed after ${MAX_RETRIES + 1} attempts: ${lastError.message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Rough token count estimator (~4 chars per token)
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

module.exports = { processDocument, estimateTokens };

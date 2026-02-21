import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const server: FastifyInstance = fastify({ logger: true });

const PORT = Number(process.env.PORT) || 3000;
const TIMEOUT = Number(process.env.TIMEOUT) || 60000; // 60 seconds
const MAX_COMMITS_LENGTH = Number(process.env.MAX_COMMITS_LENGTH) || 50;
const MAX_DIFF_LENGTH = Number(process.env.MAX_DIFF_LENGTH) || 10000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GOOGLE_GEMINI_BASE_URL = process.env.GOOGLE_GEMINI_BASE_URL || "";
const EXTENSION_ID = process.env.EXTENSION_ID || "";

// Register plugins
server.register(cors, {
  origin: EXTENSION_ID || '*',
});

server.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

// Cache storage (Simple in-memory cache)
const cache = new Map<string, any>();

server.get('/ping', async (request, reply) => {
  return { status: 'ok', message: 'Service is reachable' };
});

interface GenerateRequestBody {
  commits: string[];
  diff: string;
}

interface GenerateResponse {
  title: string;
  description: string;
}

// Helper to generate hash for cache key
function generateCacheKey(commits: string[], diff: string): string {
  const content = commits.join('') + diff;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

server.post<{ Body: GenerateRequestBody }>('/generate', async (request, reply) => {
  const { commits, diff } = request.body;
  
  server.log.info({ 
    msg: 'Received generation request', 
    commitCount: commits.length, 
    diffLength: diff.length 
  });

  if (!GEMINI_API_KEY) {
    return reply.status(500).send({ error: 'Service Configuration Error: Missing Gemini API Key.' });
  }

  // Check cache (Always cache since we control the key)
  const cacheKey = generateCacheKey(commits, diff);
  if (cache.has(cacheKey)) {
    server.log.info('Serving from cache');
    return cache.get(cacheKey);
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const requestOptions = {
      baseUrl: GOOGLE_GEMINI_BASE_URL || undefined,
      timeout: TIMEOUT
    };

    const jsonPrompt = `
You are a PR assistant. Analyze the code changes and return a JSON object with "title" and "description" fields.

STRICT OUTPUT RULES:
1. Return ONLY valid JSON.
2. Do NOT include markdown formatting like \`\`\`json\` wrapper.
3. The "description" field must contain the full markdown body.

CONTENT GENERATION RULES:
- **Title**: Use Conventional Commits format (e.g., "feat: ...", "fix: ...").
- **Summary**: Write a concise paragraph summarizing the overall change and its purpose.
- **Key Changes**: List the main changes as bullet points with bold component/feature names followed by nested sub-bullets for details. Group related changes together.
- **Notable Implementation Details**: Highlight important technical decisions, architectural choices, or caveats as bullet points.
- **Impact**: Write a paragraph describing the value and effect of these changes on users or the system.

Target Markdown Structure for "description":
## Summary
(Concise paragraph summarizing the overall change and its purpose)

## Key Changes

- **Component or feature name**: Description of the change
  - Sub-item detail
  - Sub-item detail
- **Another component**: Description of the change

## Notable Implementation Details

- Important technical detail or architectural decision
- Any caveats, remaining gaps, or follow-up work needed

## Impact

(Paragraph describing the value and effect of these changes)

Commits:
${commits.slice(0, MAX_COMMITS_LENGTH).join('\n')}

Diff:
${diff.substring(0, MAX_DIFF_LENGTH)}
    `;

    const jsonModel = genAI.getGenerativeModel({ 
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    }, requestOptions);

    const jsonResult = await jsonModel.generateContent(jsonPrompt);
    const jsonResponse = await jsonResult.response;
    let jsonText = jsonResponse.text();
    
    // Clean up potential markdown code blocks
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    
    const data = JSON.parse(jsonText);

    // Cache the result
    cache.set(cacheKey, data);

    return data;

  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ error: 'Failed to generate content', details: error });
  }
});

const start = async () => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server running at Port ${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

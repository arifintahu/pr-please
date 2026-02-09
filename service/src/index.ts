import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const server: FastifyInstance = fastify({ logger: true });

// Register plugins
server.register(cors, {
  origin: '*', // For development, allow all. In prod, restrict to extension ID or localhost.
});

server.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

// Cache storage (Simple in-memory cache)
const cache = new Map<string, any>();

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

  // Use API Key from Env only (Service provided)
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return reply.status(500).send({ error: 'Service Configuration Error: Missing Gemini API Key.' });
  }

  // Check cache (Always cache since we control the key)
  const cacheKey = generateCacheKey(commits, diff);
  if (cache.has(cacheKey)) {
    server.log.info('Serving from cache');
    return cache.get(cacheKey);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const baseUrl = process.env.GOOGLE_GEMINI_BASE_URL;
    const requestOptions = {
      baseUrl: baseUrl || undefined,
      timeout: 60000 // 60 seconds
    };

    const jsonPrompt = `
You are a PR assistant. Analyze the code changes and return a JSON object with "title" and "description" fields.
The "description" field should contain the full markdown body using the template below.

Template:
# Task
<!-- Please add link a relevant issue or task -->

# Description
<!-- Please include a summary of the change -->
<!-- Any details that you think are important to review this PR? -->
<!-- Are there other PRs related to this one? -->

# Demo
<!-- Add a screenshot or a video demonstration when possible -->

# How Has This Been Tested?
<!-- Please describe how you tested your changes -->

# Checklist
<!-- Go over all the following points, and put an x in all the boxes that apply -->
- [ ] I have performed a self-review of my own code
- [ ] I have added tests to cover my changes

Commits:
${commits.join('\n')}

Diff:
${diff.substring(0, 30000)}
    `;

    // gemini-2.5-flash supports responseMimeType: "application/json"
    const jsonModel = genAI.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    }, requestOptions);

    const jsonResult = await jsonModel.generateContent(jsonPrompt);
    const jsonResponse = await jsonResult.response;
    const jsonText = jsonResponse.text();
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
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server running at http://localhost:3000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

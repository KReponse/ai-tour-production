import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

console.log('=================================');
console.log('🔍 AI Tour Gemini Test');
console.log('=================================');
console.log('API key exists:', !!apiKey);
console.log('API key length:', apiKey?.length || 0);
console.log('Model:', model);

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY is missing');
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey,
});

try {
  console.log('\n📤 Testing Gemini...');

  const response = await ai.models.generateContent({
    model,
    contents: 'Reply with exactly: AI Tour Gemini test successful',
  });

  console.log('\n✅ GEMINI SUCCESS');
  console.log('Model:', model);
  console.log('Response:', response.text);

} catch (error) {
  console.error('\n❌ GEMINI FAILED');
  console.error('Model:', model);
  console.error('Name:', error?.name);
  console.error('Message:', error?.message);
  console.error('Cause:', error?.cause);

  if (error?.message?.includes('503')) {
    console.error('\n⚠️ Gemini returned 503 UNAVAILABLE.');
    console.error('This usually means temporary model/service overload.');
  }

  if (error?.message?.includes('429')) {
    console.error('\n⛔ Gemini quota/rate limit reached.');
  }

  if (
    error?.message?.includes('401') ||
    error?.message?.includes('403') ||
    error?.message?.toLowerCase()?.includes('api key')
  ) {
    console.error('\n🔑 Check your Gemini API key and permissions.');
  }

  console.error('\nFull stack:');
  console.error(error?.stack);
}
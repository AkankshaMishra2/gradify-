import 'dotenv/config';

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY missing in environment');
    process.exit(1);
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) {
      const body = await res.text();
      console.error('Failed to list models:', res.status, res.statusText, body);
      process.exit(1);
    }

    const data = await res.json();
    const models = Array.isArray(data.models) ? data.models : [];
    if (!models.length) {
      console.log('No models returned by API.');
      return;
    }

    console.log('Gemini models available to this API key that support generateContent:');
    for (const model of models) {
      if (Array.isArray(model.supportedGenerationMethods) && model.supportedGenerationMethods.includes('generateContent')) {
        console.log(`- ${model.name}`);
      }
    }
  } catch (error) {
    console.error('Error fetching models:', error.message);
    process.exit(1);
  }
}

main();

// const fetch = require('node-fetch'); // Native fetch is available in Node 18+

async function verifyFix() {
  const sessionId = `test-session-${Date.now()}`;
  const baseUrl = 'http://localhost:3000/api/webhook/n8n-template';

  console.log(`Testing with Session ID: ${sessionId}`);

  // 1. POST Data
  console.log('1. Sending POST request...');
  const postRes = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      agent_data: {
        name: 'Test Agent',
        description: 'Verifying persistence',
        system_prompt: 'You are a test agent.',
      },
    }),
  });
  const postData = await postRes.json();
  console.log('POST Response:', postData);

  if (!postData.success) {
    console.error('POST failed');
    return;
  }

  // 2. First GET Read
  console.log('2. Sending First GET request...');
  const getRes1 = await fetch(`${baseUrl}?session=${sessionId}`);
  const getData1 = await getRes1.json();
  console.log('GET 1 Response:', getData1);

  if (!getData1.success) {
    console.error('GET 1 failed');
    return;
  }

  // 3. Second GET Read (Crucial Step)
  console.log('3. Sending Second GET request...');
  const getRes2 = await fetch(`${baseUrl}?session=${sessionId}`);
  const getData2 = await getRes2.json();
  console.log('GET 2 Response:', getData2);

  if (getData2.success) {
    console.log('SUCCESS: Data persisted after first read!');
  } else {
    console.error('FAILURE: Data was deleted after first read.');
  }
}

verifyFix().catch(console.error);

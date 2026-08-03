// test-ai-provider.js (Create in root)
import dotenv from 'dotenv';
dotenv.config();
import aiProvider from './src/ai/providers/providerInterface.js';

async function testProvider() {
  console.log('🧪 Testing AI Provider...');
  console.log('📊 Provider Info:', aiProvider.getProviderInfo());
  
  console.log('📌 isAvailable:', aiProvider.isAvailable());
  
  if (!aiProvider.isAvailable()) {
    console.log('❌ Provider not available, checking details...');
    console.log('📌 Provider object:', aiProvider.provider);
    console.log('📌 Provider ready:', aiProvider.provider?.isReady?.());
    return;
  }
  
  console.log('✅ Provider is available, testing chat...');
  
  try {
    const response = await aiProvider.chat([
      { role: 'system', content: 'You are a Rwanda travel expert.' },
      { role: 'user', content: 'What is the best time to visit Rwanda?' }
    ]);
    
    console.log('📥 Response:', response.content);
    console.log('✅ Test passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProvider();
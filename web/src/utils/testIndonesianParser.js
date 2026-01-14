/**
 * Test the Indonesian Analysis Parser
 */

import { parseIndonesianAnalysis, cleanMarkdown } from './indonesianAnalysisParser.js';

console.log('🧪 Testing Indonesian Analysis Parser\n');

// Test 1: Parse the analysis
const result = parseIndonesianAnalysis(sampleText);

console.log('✅ Symptoms Found:', result.symptoms.length);
result.symptoms.forEach((symptom, idx) => {
  console.log(`   ${idx + 1}. ${symptom.name} (${symptom.severity})`);
  console.log(`      ${symptom.description.substring(0, 50)}...`);
});

console.log('\n✅ Recommendations Found:', result.recommendations.length);
result.recommendations.forEach((rec, idx) => {
  console.log(`   ${idx + 1}. ${rec.title} (${rec.urgency}, ${rec.priority})`);
  console.log(`      ${rec.description.substring(0, 50)}...`);
});

// Test 2: Clean markdown
console.log('\n✅ Testing Markdown Cleaning:');
const testMarkdown = '**Bold text** with *italic* and ***bold italic*** and * standalone asterisk *';
const cleaned = cleanMarkdown(testMarkdown);
console.log(`   Input:  "${testMarkdown}"`);
console.log(`   Output: "${cleaned}"`);
console.log(`   Has asterisks: ${cleaned.includes('*') ? '❌ FAIL' : '✅ PASS'}`);

console.log('\n📊 Test Summary:');
console.log(`   Symptoms extracted: ${result.symptoms.length >= 3 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`   Recommendations extracted: ${result.recommendations.length >= 3 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`   Markdown cleaned: ${!cleaned.includes('*') ? '✅ PASS' : '❌ FAIL'}`);

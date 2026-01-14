/**
 * Test suite for medical history normalization logic
 * Validates that backend medicalDetails are correctly transformed to frontend medicalHistory format
 */

/**
 * Normalize medical details from backend to frontend format
 * This logic mirrors the normalization done in handlePatientSelect
 */
export function normalizeMedicalHistory(medicalDetails) {
  if (!medicalDetails) return null;
  
  // Create normalized object first, then spread additional fields
  // This ensures normalized arrays take precedence over original fields
  const normalized = {
    allergies: Array.isArray(medicalDetails.allergies) ? medicalDetails.allergies : [],
    // Prefer 'conditions' over 'chronicConditions' for backwards compatibility
    conditions: Array.isArray(medicalDetails.conditions) ? medicalDetails.conditions : 
               Array.isArray(medicalDetails.chronicConditions) ? medicalDetails.chronicConditions : [],
    medications: Array.isArray(medicalDetails.medications) ? medicalDetails.medications : [],
    surgeries: Array.isArray(medicalDetails.surgeries) ? medicalDetails.surgeries : [],
    familyHistory: typeof medicalDetails.familyHistory === 'object' && medicalDetails.familyHistory !== null ? medicalDetails.familyHistory : {},
  };
  
  // Spread any additional fields from the original medicalDetails
  // but exclude the ones we've already normalized
  const excludeKeys = ['allergies', 'chronicConditions', 'conditions', 'medications', 'surgeries', 'familyHistory'];
  for (const [key, value] of Object.entries(medicalDetails)) {
    if (!excludeKeys.includes(key)) {
      normalized[key] = value;
    }
  }
  
  return normalized;
}

// Test cases
const testCases = [
  {
    name: 'Full medical details with chronicConditions',
    input: {
      allergies: ['Penicillin', 'Peanuts'],
      chronicConditions: ['Diabetes', 'Hypertension'],
      medications: ['Aspirin', 'Metformin'],
      surgeries: ['Appendectomy'],
      familyHistory: { diabetes: true, cancer: false }
    },
    validationFn: (result) => {
      return result &&
        result.allergies?.length === 2 &&
        result.conditions?.length === 2 &&
        result.conditions?.[0] === 'Diabetes' &&
        result.medications?.length === 2 &&
        result.surgeries?.length === 1 &&
        result.familyHistory?.diabetes === true;
    }
  },
  {
    name: 'Medical details with conditions field instead of chronicConditions',
    input: {
      allergies: ['Penicillin'],
      conditions: ['Diabetes'],
      medications: ['Aspirin']
    },
    validationFn: (result) => {
      return result &&
        result.allergies?.length === 1 &&
        result.conditions?.length === 1 &&
        result.medications?.length === 1 &&
        result.surgeries?.length === 0;
    }
  },
  {
    name: 'Empty/missing medical fields',
    input: {
      allergies: [],
      chronicConditions: [],
      medications: []
    },
    validationFn: (result) => {
      return result &&
        result.allergies?.length === 0 &&
        result.conditions?.length === 0 &&
        result.medications?.length === 0 &&
        result.surgeries?.length === 0;
    }
  },
  {
    name: 'Null/undefined inputs become empty arrays',
    input: {
      allergies: null,
      chronicConditions: undefined,
      medications: null
    },
    validationFn: (result) => {
      // The main concern is that the normalized fields (allergies, conditions, medications)
      // are always arrays, even if the original fields were null/undefined
      return result &&
        Array.isArray(result.allergies) && result.allergies?.length === 0 &&
        Array.isArray(result.conditions) && result.conditions?.length === 0 &&
        Array.isArray(result.medications) && result.medications?.length === 0;
    }
  },
  {
    name: 'No medical details object returns null',
    input: null,
    validationFn: (result) => result === null
  },
  {
    name: 'Conditions field takes precedence over chronicConditions',
    input: {
      chronicConditions: ['Old Diabetes'],
      conditions: ['New Diabetes'],
      allergies: []
    },
    validationFn: (result) => {
      return result &&
        result.conditions?.length === 1 &&
        result.conditions?.[0] === 'New Diabetes';
    }
  }
];

// Run tests
console.log('🧪 Medical History Normalization Tests\n');
let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = normalizeMedicalHistory(testCase.input);
  const isPass = testCase.validationFn(result);
  
  if (isPass) {
    console.log(`✅ Test ${index + 1}: ${testCase.name}`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: ${testCase.name}`);
    console.log('  Input:', testCase.input);
    console.log('  Result:', result);
    failed++;
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

// Export for use in actual code
export default {
  normalizeMedicalHistory,
  testCases
};

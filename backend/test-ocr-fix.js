import { parseStudentAnswers } from './src/utils/ocr.js';

const sampleText = `
Q1(a)
1. First loop worst case: Run = n
2. Second loop worst case: Run = n
3. Third loop worst case: Run = n

So, Time complexity -> n * n * n
O(n^3) is worst time complexity.

Q1(b)
Algorithm:
1. Min = arr[0], count = 0
2. for (i=1; i<N; i++) {
   if (arr[i] > Min)
`;

console.log("Testing parseStudentAnswers with numbered list content...");
const result = parseStudentAnswers(sampleText);

console.log(JSON.stringify(result, null, 2));

// Check if "1." and "2." were merged into Q1(a) or Q1(b) instead of becoming new questions
const q1a = result.find(q => q.label && q.label.includes('1(a)'));
const q1b = result.find(q => q.label && q.label.includes('1(b)'));

if (q1a && q1a.answer.includes('1. First loop') && q1a.answer.includes('2. Second loop')) {
    console.log("SUCCESS: Q1(a) captured numbered list correctly.");
} else {
    console.log("FAILURE: Q1(a) did not capture numbered list.");
    if (q1a) console.log("Q1(a) content:", q1a.answer);
}

if (q1b && q1b.answer.includes('1. Min = arr') && q1b.answer.includes('2. for (i=1')) {
    console.log("SUCCESS: Q1(b) captured numbered list correctly.");
} else {
    console.log("FAILURE: Q1(b) did not capture numbered list.");
    if (q1b) console.log("Q1(b) content:", q1b.answer);
}

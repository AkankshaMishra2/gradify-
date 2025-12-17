import { createObjectCsvStringifier } from 'csv-writer';

export const studentsToCsv = (students) => {
  const qSet = new Set();
  students.forEach((s) => s.evaluatedMarks?.forEach((q) => qSet.add(q.number)));
  const qNumbers = Array.from(qSet).sort((a, b) => Number(a) - Number(b));

  const headers = [
    { id: 'name', title: 'Name' },
    { id: 'rollNumber', title: 'Roll Number' },
    ...qNumbers.map((n) => ({ id: `q_${n}`, title: `Q${n}` })),
    { id: 'totalScore', title: 'Total Score' },
    { id: 'status', title: 'Status' },
  ];

  const stringifier = createObjectCsvStringifier({ header: headers });

  const records = students.map((s) => {
    const base = { name: s.name, rollNumber: s.rollNumber, totalScore: s.totalScore, status: s.status };
    for (const n of qNumbers) {
      const found = s.evaluatedMarks?.find((q) => q.number === n);
      base[`q_${n}`] = found ? found.score : '';
    }
    return base;
  });

  return stringifier.getHeaderString() + stringifier.stringifyRecords(records);
};

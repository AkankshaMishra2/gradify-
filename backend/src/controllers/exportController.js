import Student from '../models/Student.js';
import { studentsToCsv } from '../utils/csv.js';

export const exportCsv = async (req, res) => {
  try {
    const students = await Student.find({}).sort({ createdAt: -1 });
    const csv = studentsToCsv(students);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="gradify_students.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    return res.status(500).json({ error: 'CSV export failed', message: err.message });
  }
};

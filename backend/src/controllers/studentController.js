import Student from '../models/Student.js';

export const listStudents = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { q, status } = req.query;
    const filter = { createdBy: userId };
    if (status) filter.status = status;
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { rollNumber: { $regex: q, $options: 'i' } },
      ];
    }
    const students = await Student.find(filter).sort({ createdAt: -1 });
    return res.json({ students });
  } catch (err) {
    return res.status(500).json({ error: 'Fetch students failed', message: err.message });
  }
};

export const getStudent = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const student = await Student.findOne({ _id: id, createdBy: userId });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    return res.json({ student });
  } catch (err) {
    return res.status(500).json({ error: 'Fetch student failed', message: err.message });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    console.log(`Attempting to delete student with ID: ${id}`);
    const student = await Student.findOneAndDelete({ _id: id, createdBy: userId });
    if (!student) {
      console.log(`Student with ID: ${id} not found`);
      return res.status(404).json({ error: 'Student not found' });
    }
    console.log(`Student with ID: ${id} deleted successfully`);
    return res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    console.error(`Delete student failed: ${err.message}`);
    return res.status(500).json({ error: 'Delete student failed', message: err.message });
  }
};

import mongoose from 'mongoose';

const qMarkSchema = new mongoose.Schema({
  number: { type: String, required: true },
  answer: { type: String },
  score: { type: Number, default: 0 },
  maxMarks: { type: Number, default: 0 },
  reason: { type: String },
  conceptMatch: { type: String },
  missingPoints: { type: String },
  percentage: { type: Number },
  mappingConfidence: { type: Number },
  confidence: { type: Number },
});

const studentSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    rollNumber: { type: String, required: true, index: true },
    extractedAnswers: [{ number: String, answer: String }],
    evaluatedMarks: [qMarkSchema],
    totalScore: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'evaluated'], default: 'pending' },
  },
  { timestamps: true }
);

export default mongoose.model('Student', studentSchema);

import mongoose from 'mongoose';

const evalSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    answerKey: { type: mongoose.Schema.Types.ObjectId, ref: 'AnswerKey', required: true },
    evaluatorModel: { type: String },
    details: [
      {
        number: String,
        question: String,
        correctAnswer: String,
        studentAnswer: String,
        maxMarks: Number,
        score: Number,
        reason: String,
        conceptMatch: String,
        missingPoints: String,
        percentage: Number,
        mappingConfidence: Number,
        confidence: Number,
      },
    ],
    totalScore: { type: Number, default: 0 },
    weakAreas: [String],
    overallConfidence: { type: Number },
    mappingDetails: [
      {
        sourceNumber: String,
        matchedQuestionId: String,
        matchedQuestionNumber: String,
        confidence: Number,
        note: String,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('EvaluationRecord', evalSchema);

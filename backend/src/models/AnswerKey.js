import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  number: { type: String, required: true },
  correctAnswer: { type: String, required: true },
  maxMarks: { type: Number, required: true },
});

const answerKeySchema = new mongoose.Schema(
  {
    title: { type: String },
    filePath: { type: String },
    questions: [questionSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('AnswerKey', answerKeySchema);

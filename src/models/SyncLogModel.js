import mongoose from 'mongoose';

const syncLogSchema = new mongoose.Schema({
  blogId: { type: mongoose.Schema.Types.ObjectId, ref: 'Blog', required: true },
  title: { type: String },
  syncedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['success', 'fail'], required: true },
  errorMessage: { type: String, default: '' },
});

const SyncLog = mongoose.model('SyncLog', syncLogSchema);
export default SyncLog;

'use strict';

const mongoose = require('mongoose');

const OPERATION_TYPES = ['uppercase', 'lowercase', 'reverse', 'word_count'];
const TASK_STATUSES = ['pending', 'running', 'success', 'failed'];

const logEntrySchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
    message: { type: String, required: true },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [1, 'Title cannot be empty'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    inputText: {
      type: String,
      required: [true, 'Input text is required'],
      maxlength: [5000, 'Input text cannot exceed 5000 characters'],
    },
    operation: {
      type: String,
      enum: { values: OPERATION_TYPES, message: 'Invalid operation type' },
      required: [true, 'Operation type is required'],
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: 'pending',
    },
    result: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    logs: {
      type: [logEntrySchema],
      default: [],
    },
    jobId: {
      type: String,
      default: null,
      index: true,
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    processingTimeMs: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
  }
);

// Compound indexes for efficient querying
taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ userId: 1, status: 1, createdAt: -1 });
taskSchema.index({ status: 1 });
taskSchema.index({ jobId: 1 }, { sparse: true });

// Virtual: duration label
taskSchema.virtual('duration').get(function () {
  if (this.processingTimeMs === null) return null;
  return `${this.processingTimeMs}ms`;
});

module.exports = mongoose.model('Task', taskSchema);
module.exports.OPERATION_TYPES = OPERATION_TYPES;
module.exports.TASK_STATUSES = TASK_STATUSES;

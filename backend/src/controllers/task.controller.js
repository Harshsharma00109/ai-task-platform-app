'use strict';

const Task = require('../models/task.model');
const { enqueueTask } = require('../services/queue.service');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const logger = require('../utils/logger');

async function createTask(req, res, next) {
  try {
    const { title, inputText, operation } = req.body;
    const userId = req.user._id;

    const task = await Task.create({
      userId,
      title,
      inputText,
      operation,
      status: 'pending',
      logs: [{ level: 'info', message: 'Task created and queued for processing.' }],
    });

    // Enqueue to Redis via BullMQ
    const job = await enqueueTask(task._id, {
      title: task.title,
      inputText: task.inputText,
      operation: task.operation,
    });

    // Save jobId reference
    task.jobId = job.id;
    await task.save();

    logger.info(`Task created: ${task._id} by user ${userId}`);

    return sendSuccess(res, { task }, 'Task created and queued successfully', 201);
  } catch (error) {
    next(error);
  }
}

async function getTasks(req, res, next) {
  try {
    const userId = req.user._id;
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = { userId };
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { inputText: { $regex: search, $options: 'i' } },
      ];
    }

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const allowedSortFields = ['createdAt', 'updatedAt', 'status', 'title'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Task.countDocuments(filter),
    ]);

    return sendPaginated(
      res,
      tasks,
      {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1,
      },
      'Tasks retrieved'
    );
  } catch (error) {
    next(error);
  }
}

async function getTaskById(req, res, next) {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) return sendError(res, 'Task not found', 404);
    return sendSuccess(res, { task }, 'Task retrieved');
  } catch (error) {
    next(error);
  }
}

async function deleteTask(req, res, next) {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!task) return sendError(res, 'Task not found', 404);
    logger.info(`Task deleted: ${req.params.id} by user ${req.user._id}`);
    return sendSuccess(res, {}, 'Task deleted successfully');
  } catch (error) {
    next(error);
  }
}

async function retryTask(req, res, next) {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) return sendError(res, 'Task not found', 404);

    if (task.status !== 'failed') {
      return sendError(res, 'Only failed tasks can be retried', 400);
    }

    task.status = 'pending';
    task.result = null;
    task.errorMessage = null;
    task.startedAt = null;
    task.completedAt = null;
    task.processingTimeMs = null;
    task.attemptCount += 1;
    task.logs.push({ level: 'info', message: `Task retry initiated (attempt #${task.attemptCount + 1})` });

    const job = await enqueueTask(task._id, {
      title: task.title,
      inputText: task.inputText,
      operation: task.operation,
    });

    task.jobId = job.id;
    await task.save();

    return sendSuccess(res, { task }, 'Task queued for retry');
  } catch (error) {
    next(error);
  }
}

async function getTaskStats(req, res, next) {
  try {
    const userId = req.user._id;

    const [stats] = await Task.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          running: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } },
          success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          avgProcessingMs: { $avg: '$processingTimeMs' },
        },
      },
      { $project: { _id: 0 } },
    ]);

    return sendSuccess(
      res,
      {
        stats: stats || {
          total: 0, pending: 0, running: 0, success: 0, failed: 0, avgProcessingMs: null,
        },
      },
      'Statistics retrieved'
    );
  } catch (error) {
    next(error);
  }
}

module.exports = { createTask, getTasks, getTaskById, deleteTask, retryTask, getTaskStats };

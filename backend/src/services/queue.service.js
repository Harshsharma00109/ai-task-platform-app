'use strict';

const { Queue } = require('bullmq');
const { getRedisConnection } = require('../config/redis');
const logger = require('../utils/logger');

const QUEUE_NAME = 'task-processing';
let taskQueue = null;

function getTaskQueue() {
  if (!taskQueue) {
    taskQueue = new Queue(QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { count: 1000, age: 24 * 3600 },
        removeOnFail: { count: 500, age: 7 * 24 * 3600 },
      },
    });

    taskQueue.on('error', (err) => {
      logger.error('BullMQ Queue error:', err.message);
    });
  }
  return taskQueue;
}

async function enqueueTask(taskId, payload) {
  const queue = getTaskQueue();
  const job = await queue.add(
    'process-task',
    { taskId: taskId.toString(), ...payload },
    { jobId: `task-${taskId}` }
  );
  logger.info(`Task enqueued: ${taskId}, jobId: ${job.id}`);
  return job;
}

module.exports = { getTaskQueue, enqueueTask };

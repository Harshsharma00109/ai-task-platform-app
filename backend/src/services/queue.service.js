'use strict';

const logger = require('../utils/logger');

const IS_TEST = process.env.NODE_ENV === 'test';

let Queue = null;
let taskQueue = null;

if (!IS_TEST) {
  Queue = require('bullmq').Queue;
}

const QUEUE_NAME = 'task-processing';

function getTaskQueue() {
  if (IS_TEST) return null;

  if (!taskQueue) {
    const { getRedisConnection } = require('../config/redis');
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
  // In test mode return a fake job object so createTask doesn't crash
  if (IS_TEST) {
    logger.info(`[TEST] Task enqueue skipped: ${taskId}`);
    return { id: `test-job-${taskId}` };
  }

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

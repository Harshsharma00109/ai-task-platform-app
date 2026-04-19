// MongoDB initialization script
// Runs once when the container is first created

db = db.getSiblingDB('ai_task_platform');

// Create indexes for performance
db.users.createIndex({ email: 1 }, { unique: true, background: true });
db.users.createIndex({ createdAt: -1 }, { background: true });

db.tasks.createIndex({ userId: 1, createdAt: -1 }, { background: true });
db.tasks.createIndex({ userId: 1, status: 1, createdAt: -1 }, { background: true });
db.tasks.createIndex({ status: 1 }, { background: true });
db.tasks.createIndex({ jobId: 1 }, { sparse: true, background: true });

print('MongoDB initialized: indexes created for ai_task_platform');

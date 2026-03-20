// docker/mongo-init.js
// Runs once on first container startup to create the app user + indexes

db = db.getSiblingDB('stockpredictor');

db.createUser({
  user: 'stockapp',
  pwd: 'stockapp_pass',
  roles: [{ role: 'readWrite', db: 'stockpredictor' }]
});

// Create collections with validation
db.createCollection('predictions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['ticker', 'horizon', 'predictions', 'createdAt'],
      properties: {
        ticker: { bsonType: 'string' },
        horizon: { bsonType: 'int' },
        predictions: { bsonType: 'array' },
        createdAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('trainJobs');
db.createCollection('users');
db.createCollection('watchlists');

// Indexes for performance
db.predictions.createIndex({ ticker: 1, createdAt: -1 });
db.predictions.createIndex({ ticker: 1, horizon: 1, createdAt: -1 });
db.predictions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 * 7 }); // TTL 7 days

db.trainJobs.createIndex({ jobId: 1 }, { unique: true });
db.trainJobs.createIndex({ ticker: 1, status: 1 });
db.trainJobs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 * 30 }); // TTL 30 days

db.users.createIndex({ email: 1 }, { unique: true });
db.watchlists.createIndex({ userId: 1 });

print('MongoDB initialized successfully');

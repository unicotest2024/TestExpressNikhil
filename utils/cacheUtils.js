// utils/cacheUtils.js
const db = require('../db');
const client = require('../redisClient');

const cacheKey = 'cached_students';

const refreshStudentCache = async () => {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM student', async (err, result) => {
      if (err) {
        console.error('Error refreshing cache:', err);
        return reject(err);
      }

      try {
        await client.setEx(cacheKey, 3600, JSON.stringify(result));
        console.log('Redis cache refreshed');
        resolve();
      } catch (redisErr) {
        console.error('Redis cache update failed:', redisErr);
        reject(redisErr);
      }
    });
  });
};



module.exports = { refreshStudentCache };


const db = require("../db");
const redisClient = require("../redisClient");
const dotenv = require('dotenv')
dotenv.config();

const user = process.env.USER;

async function refreshAllProfilesCache() {
  try {
    console.log("Refreshing all user profiles into Redis...");

    const [users] = await db.promise().query("SELECT id, username, email, role FROM users where is_deleted=0");

    if (!users.length) {
      console.log("No users found in database.");
      return;
    }

    for (const user of users) {
      const redisKey = `:${user.id}`;
      await redisClient.hSet(redisKey, {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        role: user.role
      });
    }

    console.log(`Cached ${users.length} user profiles in Redis`);
  } catch (err) {
    console.error("Error caching user profiles:", err);
  }
}

async function getProfileById(userId) {
  try {
    const redisKey = `user:${userId}`;

    //Try Redis cache first
    const cachedUser = await redisClient.hGetAll(redisKey);
    if (cachedUser && Object.keys(cachedUser).length > 0) {
      console.log("Profile served from Redis cache");
      return { source: "cache", user: cachedUser };
    }

    //Fallback to MySQL
    const [rows] = await db
      .promise()
      .query("SELECT id, username, email, role, created_at FROM users WHERE id = ? and  is_deleted = 0", [userId]);

    if (rows.length === 0) {
      return null; // no user found
    }

    const user = rows[0];

    // 3️⃣ Store in Redis for next time
    await redisClient.hSet(redisKey, {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at.toISOString(),
    });

    console.log("Cached user profile in Redis");

    return { source: "db", user };
  } catch (err) {
    console.error("Error in getProfileById:", err);
    throw err;
  }
}

async function addUserToCache(user) {
  try {
    const redisKey = `user:${user.id}`;
    await redisClient.hSet(redisKey, {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at.toISOString(),
    });
    console.log(`User ${user.username} added to Redis cache`);
  } catch (err) {
    console.error("Error caching new user:", err);
  }
}

async function updateUserInCache(userId, { username, email, role }) {
  try {
    const redisKey = `user:${userId}`;

    const exists = await redisClient.exists(redisKey);
    if (!exists) {
      console.log(`User ${userId} not in cache. Adding fresh entry.`);
    }

    await redisClient.hSet(redisKey, {
      id: userId.toString(),
      username,
      email,
      role,
      updated_at: new Date().toISOString(),
    });

    console.log(`User ${username} updated in Redis cache`);
  } catch (err) {
    console.error("Error updating user in Redis:", err);
  }
}


async function deleteUserFromCache(userId) {
  try {
    const redisKey = `user:${userId}`;
    const result = await redisClient.del(redisKey);
    console.log(
      result
        ? `User ${userId} removed from Redis cache`
        : `User ${userId} was not found in cache`
    );
  } catch (err) {
    console.error("Error deleting user from Redis:", err);
  }
}





module.exports = { refreshAllProfilesCache , getProfileById , addUserToCache , updateUserInCache , deleteUserFromCache};

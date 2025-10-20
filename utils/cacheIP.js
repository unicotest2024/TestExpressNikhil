
const db = require("../db");
const redisClient = require("../redisClient");

async function refreshIPCache() {
  return new Promise((resolve, reject) => {
    db.query("SELECT ip FROM ip_addresses", async (err, results) => {
      if (err) {
        console.error("Failed to fetch IPs from DB:", err);
        return reject(err);
      }

      if (!results.length) {
        console.warn("No IP addresses found in DB");
        return resolve();
      }

      try {
        // Clear old cache
        await redisClient.del("allowed_ips");

        // Store all IPs as a Redis SET
        const ipList = results.map(r => r.ip);
        await redisClient.sAdd("allowed_ips", ipList);

        console.log(`Cached ${ipList.length} IPs in Redis`);
        resolve();
      } catch (e) {
        console.error("Failed to cache IPs:", e);
        reject(e);
      }
    });
  });
}

module.exports = { refreshIPCache };

const db = require("../db");
const redisClient = require("../redisClient");

// Add new IP
const addIPAddress = async (req, res) => {
  const { ip } = req.body;

  if (!ip) return res.status(400).json({ message: "IP is required" });

  try {

    //Insert into MySQL
   db.query(
  "INSERT INTO ip_addresses (ip) VALUES (?)",
  [ip],
  async (err, result) => {
    if (err) {
      // check if it's a duplicate entry
      if (err.code === "ER_DUP_ENTRY") {
        console.warn(`IP ${ip} already exists in DB, skipping insert.`);
      } else {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Database insert error" });
      }
    }

    // Add to Redis cache (safe even if duplicate, Redis Set ignores duplicates)
    await redisClient.sAdd("allowed_ips", ip);

    console.log(`IP ${ip} cached successfully.`);
    return res.status(201).json({ message: "IP added or already exists, cache updated" });
  }
);

  } catch (error) {
    console.error("Add IP error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update IP
const updateIPAddress = async (req, res) => {
  const { oldIP, newIP } = req.body;

  if (!oldIP || !newIP) return res.status(400).json({ message: "Both oldIP and newIP are required" });

  try {
    //Update in MySQL
    db.query(
      "UPDATE ip_addresses SET ip = ? WHERE ip = ?",
      [newIP, oldIP],
      async (err, result) => {
        if (err) return res.status(500).json({ message: "Database update error" });

        if (result.affectedRows === 0)
          return res.status(404).json({ message: "Old IP not found" });

        //Update in Redis cache
        await redisClient.sRem("allowed_ips", oldIP);
        await redisClient.sAdd("allowed_ips", newIP);

        console.log(`IP updated in DB and Redis: ${oldIP} → ${newIP}`);
        res.status(200).json({ message: "IP updated successfully" });
      }
    );
  } catch (error) {
    console.error("Update IP error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


// Delete IP (Admin Only)
const deleteIPAddress = async (req, res) => {
  const { ip } = req.body;

  if (!ip) {
    return res.status(400).json({ message: "IP is required" });
  }

  try {
    //Delete from MySQL
    db.query("DELETE FROM ip_addresses WHERE ip = ?", [ip], async (err, result) => {
      if (err) {
        console.error("Database delete error:", err);
        return res.status(500).json({ message: "Database delete error" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "IP not found in database" });
      }

      //Delete from Redis cache
      await redisClient.sRem("allowed_ips", ip);
      console.log(`IP ${ip} deleted from DB and Redis cache`);

      res.status(200).json({ message: `IP ${ip} deleted successfully` });
    });
  } catch (error) {
    console.error("Delete IP error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


module.exports = { addIPAddress, updateIPAddress ,deleteIPAddress };

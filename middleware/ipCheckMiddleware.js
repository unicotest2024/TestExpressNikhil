
const redisClient = require("../redisClient");

const checkOfficeIP = async (req, res, next) => {
  try {
    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress;

    const cleanIP = (ipAddress || "127.0.0.1").replace("::ffff:", "");
    console.log("Checking IP:", cleanIP);

    // Check if IP is in Redis set
    const isAllowed = await redisClient.sIsMember("allowed_ips", cleanIP);

    if (!isAllowed) {
      console.warn(`Access blocked for IP: ${cleanIP}`);
      return res.status(403).json({
        message: "Access denied: Please login from office network",
        yourIP: cleanIP,
      });
    }

    console.log(`IP allowed (from cache): ${cleanIP}`);
    next();
  } catch (error) {
    console.error("Middleware error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { checkOfficeIP };

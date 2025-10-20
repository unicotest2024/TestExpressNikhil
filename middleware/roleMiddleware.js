const dotenv = require('dotenv')

const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.role === process.env.ADMIN) {
    return next();
  }
  return res.status(403).json({ message: "Access denied: Admins only" });
};

module.exports = { verifyAdmin };

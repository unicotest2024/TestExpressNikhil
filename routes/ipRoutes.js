const express = require("express");
const router = express.Router();
const { addIPAddress, updateIPAddress, deleteIPAddress } = require("../controller/ipController");
const { verifyToken } = require("../middleware/authMiddleware");
const { verifyAdmin } = require("../middleware/roleMiddleware");

// Admin-only routes
router.post("/add", verifyToken, verifyAdmin, addIPAddress);
router.put("/update", verifyToken, verifyAdmin, updateIPAddress);
router.delete("/delete", verifyToken, verifyAdmin, deleteIPAddress);


module.exports = router;
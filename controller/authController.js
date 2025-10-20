const bcrypt = require("bcryptjs");
const db = require("../db.js");
const dotenv = require('dotenv')
const jwt = require("jsonwebtoken");
//const redisClient = require("../redisClient");
const {getProfileById,addUserToCache,updateUserInCache,deleteUserFromCache} = require("../utils/profileUtil.js")
dotenv.config();


const registerUser = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check for duplicate username or email
    db.query(
      "SELECT username, email FROM users WHERE username = ? OR email = ?",
      [username, email],
      async (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Database error" });
        }

        if (result.length > 0) {
          const existing = result[0];
          if (existing.username === username) {
            return res.status(400).json({ message: "Username already taken" });
          }
          if (existing.email === email) {
            return res.status(400).json({ message: "Email already registered" });
          }
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert new user
        db.query(
          "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
          [username, email, hashedPassword, role || "user"],
          async (err, result) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ message: "Error registering user" });
            }

            //Prepare user object for Redis
            const newUser = {
              id: result.insertId,
              username,
              email,
              role: role || "user",
              created_at: new Date(), // server current time
            };

            //Add to Redis cache
            await addUserToCache(newUser);

            return res.status(201).json({
              message: "User registered successfully!",
              userId: result.insertId,
            });
          }
        );
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};



const updateUser = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const requesterRole = req.user.role;
    const {  username, email, role } = req.body;
    const userId = req.params.id
    console.log(userId);
    console.log(requesterId)
    


    // Validate inputs
    if (!userId || (!username && !email && !role)) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    // Check permission
    if (parseInt(requesterId) !== parseInt(userId) && requesterRole !== process.env.ADMIN) {
      return res.status(403).json({ message: "Not authorized to update this profile" });
    }

 

    db.query(
  "UPDATE users SET username = ?, email = ?, role = ? WHERE id = ? and is_deleted = 0",
  [username, email, role, userId],
  async (err, result) => {

   
    
    if (err) {
      console.error("Database error:", err);

      // Handle duplicate key error (email or username conflict)
      if (err.code === "ER_DUP_ENTRY") {
        let field = "value";

        if (err.sqlMessage.includes("username")) field = "username";
        else if (err.sqlMessage.includes("email")) field = "email";

        return res.status(400).json({
          message: `This ${field} is already in use by another user.`,
        });
      }

      // Handle any other DB errors
      return res.status(500).json({ message: "Database error while updating user" });
    }

    // No rows affected → user doesn’t exist
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Sync Redis cache here if needed
    await updateUserInCache(userId, { username, email, role });

    res.status(200).json({
      message: "User updated successfully",
    });
  }
);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};


const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    // Check if user exists
    db.query("SELECT * FROM users WHERE email = ? and is_deleted = 0", [email], async (err, result) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (result.length === 0)
        return res.status(401).json({ message: "Invalid credentials" });

      const user = result[0];

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch)
        return res.status(401).json({ message: "Invalid credentials" });

      // Create JWT Token
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.status(200).json({
        message: "Login successful",
        token,
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};



const getUserProfile = async (req, res) => {
  try {
    const requestedId = req.params.id; // user profile we want to see
    const requesterId = req.user.id;   // logged-in user's ID
    const requesterRole = req.user.role;

    //Role-based access control
    if (requesterRole !== process.env.ADMIN && requestedId != requesterId) {
      return res.status(403).json({ message: "Access denied: You can only view your own profile" });
    }

    const user = await getProfileById(requestedId);

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      message: "Profile fetched successfully",
      user,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};




const deleteUser = async (req, res) => {
  try {
    const { id } = req.params; // user to delete
    const requesterRole = req.user.role;

    // Only admin can delete
    if (requesterRole !== process.env.ADMIN) {
      return res.status(403).json({ message: "Not authorized to delete users" });
    }

    // Soft delete in DB
    db.query(
      "UPDATE users SET is_deleted = 1, deleted_at = NOW() WHERE id = ? and is_deleted = 0",
      [id],
      async (err, result) => {
        if (err) {
          console.error("DB Error:", err);
          return res.status(500).json({ message: "Database error" });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        // Remove from Redis cache
        await deleteUserFromCache(id);

        return res.status(200).json({
          message: "User soft deleted successfully",
          userId: id,
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};





module.exports =  {registerUser,loginUser,getUserProfile,updateUser,deleteUser}

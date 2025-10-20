const express = require('express');
const router = express.Router();
const {registerUser,loginUser,getUserProfile,updateUser,deleteUser} = require('../controller/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkOfficeIP } = require('../middleware/ipCheckMiddleware');


router.post('/register', registerUser);
router.post('/login', checkOfficeIP,(req, res, next) => {
  console.log("Middleware passed — now entering loginUser");
  next();
},loginUser)

router.get('/profile/:id',verifyToken,getUserProfile)

router.put('/profile/:id',verifyToken,updateUser)

router.delete('/profile/:id',verifyToken,deleteUser)




module.exports = router;
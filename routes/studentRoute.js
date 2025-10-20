// routes/studentRoute.js
const express = require('express');
const router = express.Router();
const {addStudent, getStudent, getStudentById,updateStudentById,deleteStudentById} = require('../controller/studentController');


router.post('/', addStudent);
router.get('/',getStudent)
router.get('/:id',getStudentById)
router.put('/:id',updateStudentById)
router.delete('/:id',deleteStudentById)



module.exports = router;

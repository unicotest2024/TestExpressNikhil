const db = require('../db')
const client = require('../redisClient')
const{ refreshStudentCache } = require('../utils/cacheUtils')

const addStudent = async (req, res) => {
  const { name, age } = req.body;

  db.query('INSERT INTO student (name, age) VALUES (?, ?)', [name, age], async (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Refresh Redis cache after adding student
    await refreshStudentCache();

    res.json({ message: 'Student added successfully', id: result.insertId });
  });
};


const getStudent = async (req, res) => {

 const cachedKey = 'cached_students';

 try{
  const cachedData = await client.get(cachedKey)

  if(cachedData){
    console.log('fetched from redis');
    return res.json({message:'student list',
      result:JSON.parse(cachedData)
    })
    
  }

  // db.query('SELECT * FROM student', async (err, result) => {
  //     if (err) {
  //       return res.status(500).json({ error: err.message });
  //     }
  //     //Store in Redis for 1 hour
  //     await client.setEx(cachedKey, 3600, JSON.stringify(result));

  //     console.log('Stored data in Redis cache');
  //     res.json({ message: 'Student list (from DB)', result });
  //   });

  await refreshStudentCache();

 }
 catch(err){

 }

  // db.query(
  //   'select * from student',

  //   (err, result) => {


  //     if (err) {

  //       return res.status(500).json({ error: err.message });

  //     }
  //     res.json({ message: 'student list ', result });
  //   }

  // );

};


const getStudentById = (req, res) => {
  const { id } = req.params;

  db.query('SELECT * FROM student WHERE id = ?', [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(results[0]); // return the single student
  });
};


const updateStudentById = (req, res) => {
  const { name, age } = req.body;
  const { id } = req.params;
  

  db.query(
    'UPDATE student SET name = ?, age = ? WHERE id = ?',
    [name, age, id],
    async (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }

      // Refresh cache after successful update
      // db.query('SELECT * FROM student', async (err, allStudents) => {
      //   if (err) {
      //     console.error('Error refreshing cache:', err);
      //   } else {
      //     await client.setEx(cacheKey, 3600, JSON.stringify(allStudents));
      //     console.log('Redis cache updated after student update');
      //   }
      // });

      await refreshStudentCache();

      res.json({ message: 'Student updated successfully', id });
    }
  );
};


const deleteStudentById = (req, res) => {
 
  const { id } = req.params;

  db.query(
    'delete from student WHERE id = ?',
    [id],
    async (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }

      
      // db.query('SELECT * FROM student', async (err, allStudents) => {
      //   if (err) {
      //     console.error('Error refreshing cache:', err);
      //   } else {
      //     await client.setEx(cacheKey, 3600, JSON.stringify(allStudents));
      //     console.log('Redis cache updated after student delete');
      //   }
      // });

      await refreshStudentCache();

      res.json({ message: 'Student deleted successfully', id });
    }
  );
};


const register = 





module.exports = { addStudent, getStudent, getStudentById , updateStudentById , deleteStudentById }
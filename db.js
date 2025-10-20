const mysql = require('mysql2')
const dotenv = require('dotenv')

dotenv.config();

const db = mysql.createConnection({
    host:'localhost',
    user:'silk123',
    password:'silk123',
    database:'express_sql_demo'

})

db.connect((err)=>{
    if(err){
        console.error('database connwction failed',err);
        return;
    }
    console.log('connected to mysql db');
    
})

module.exports = db;
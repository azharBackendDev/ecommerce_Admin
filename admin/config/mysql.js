
import { Sequelize, DataTypes } from 'sequelize';

const db = new Sequelize({
    host:'localhost',
    password:'tiger',
    database:'ecom_admin',
    dialect:'mysql',
    username:'root',
    port:3306
    
});

( async()=>{
   try {
         db.authenticate().then(()=>{
        console.log("Database conencted Connected");        
    })
    // await db.sync({alter:true})
   } 
   catch (error) {
    console.error('❌ Unable to connect to the database:', error);
   }
})();


export { db, DataTypes }



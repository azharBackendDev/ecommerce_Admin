import { app } from "./app.js";
import { db } from "./config/db.js";
import { Products } from "./model/product.model.js";


app.get('/',(req,res)=>{
    res.send("hello world")
});


app.listen(process.env.PORT || 5000,()=>{
    console.log(`Server is listenning on PORT:5000`);
    
})
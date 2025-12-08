import { db,DataTypes } from "../config/db.js";

export const Products = db.define('Products',{
     title:{type:DataTypes.STRING,allowNull:false},

     description:{type:DataTypes.STRING,allowNull:false},

     price:{type:DataTypes.FLOAT,allowNull:false},

     selling_price:{type:DataTypes.FLOAT,allowNull:false},

     category:{type:DataTypes.STRING},

     sub_category:{type:DataTypes.STRING},

     brand:{type:DataTypes.STRING,allowNull:true},
     
     sku:{type:DataTypes.STRING,allowNull:true}

});
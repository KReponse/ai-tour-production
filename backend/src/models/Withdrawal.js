import mongoose from "mongoose";


const withdrawalSchema =
new mongoose.Schema({


provider:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"User",
  required:true
},



amount:{
  type:Number,
  required:true
},



method:{
  type:String,
  enum:[
    "bank",
    "mobile_money",
    "paypal"
  ],
  default:"bank"
},



accountDetails:{
  type:String,
  required:true
},



status:{
  type:String,
  enum:[
    "pending",
    "approved",
    "paid",
    "rejected"
  ],
  default:"pending"
},



adminNote:{
  type:String,
  default:""
},



paidAt:{
  type:Date
},



},

{
timestamps:true
});


export default mongoose.model(
"Withdrawal",
withdrawalSchema
);
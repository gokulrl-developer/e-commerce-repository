const mongoose=require('mongoose');
const bcrypt=require('bcryptjs')

//Define the user schema
const userSchema=mongoose.Schema({
name:{type:String,required:true},
email:{type:String,required:true,unique:true},
phone:{type:String},
password:{type:String,required:function(){
    return !this.googleId},  // Password is required if googleId is not present
},
/* googleId:{type:String,
    required:true,
    sparse:true   //Allows for null values
}, */
status:{
    type:String,
    enum:["Active","Blocked"],
    default:"Active"
}
})

//Hashing the password before saving
userSchema.pre("save",async function(next){
 if(!this.isModified("password")) return next();
 try{
   const salt=await bcrypt.genSalt(10);
   this.password=await bcrypt.hash(this.password,salt);
   next();
 }catch(err){
  next(err);
 }
})

//method to compare hashed password
 userSchema.methods.matchPassword=async function(enteredPassword){
    return await bcrypt.compare(enteredPassword,this.password);
 };


 //create Usermodel
const User=mongoose.model('user',userSchema);


module.exports=User;
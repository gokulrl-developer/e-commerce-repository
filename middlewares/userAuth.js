const User=require('../models/userModel')
module.exports={
    checkSession:async (req,res,next)=>{
        if(req.session.user){
        const user= await User.findOne({_id:req.session.user._id,status:'Active'});
        if(!user){
            return req.session.destroy((err) => {
                if (err) {
                  console.error("Error destroying session:", err);
                  return res.render('user/user-error',{statusCode:500,message:"Internal server error"});
                }
                return res.redirect('/login');
            });
        }
            req.user=req.session.user;
            next();
        }else{
            res.redirect('/login');
        }
    },
    isLoggedIn:(req,res,next)=>{
        if(req.session.user){
            req.user=req.session.user;
             res.redirect('/');
        }else{
            next();  
        }
    }
}
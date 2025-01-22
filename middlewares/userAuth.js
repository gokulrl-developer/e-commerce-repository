const User=require('../models/userModel')
module.exports={
    checkSession:async (req,res,next)=>{
        if(req.session.user){
        const user= await User.findOne({_id:req.session.user._id});
        if(user.status !== 'Active'){
         req.session.destroy((err) => {
                if (err) {
                    if(req.xhr){return res.status(500).json({message:"server error while logging out"})
                    }else{
                  return res.render('user/user-error',{statusCode:500,message:"server error while logging out"});
                
                }}
                return res.redirect('/login');
            });
        }else{
            req.user=req.session.user;
            next();
        }
        }else{
            if(req.xhr){
                return res.status(401).json({message:"You cannot access without login"});
            }else{
              return res.redirect('/login');
            }
        }
    },
    isLoggedIn:async (req,res,next)=>{
        if(req.session.user){
            const user= await User.findOne({_id:req.session.user._id});
        if(user.status !== 'Active'){
         req.session.destroy((err) => {
                if (err) {
                  console.error("Error destroying session:", err);
                  if(req.xhr){
                    return res.status(401).json({message:"Server error while logging out"});
                }else{
                  return res.render('user/user-error',{statusCode:500,message:"server error while logging out"});
                }
                }else{

                    next();
                }
            });
        }else{
            req.user=req.session.user;
             res.redirect('/');
        }
        }else{
            next();  
        }
    },
    generalPageCheckSession:async (req,res,next)=>{
        if(req.session.user){
            const user= await User.findOne({_id:req.session.user._id});
            if(user.status !== 'Active'){
             req.session.destroy((err) => {
                    if (err) {
                        if(req.xhr){return res.status(500).json({message:"Server error while logging out"})
                        }else{
                      return res.render('user/user-error',{statusCode:500,message:"server error while logging out"});
                    }
                }
                    next();
                 });
            }else{
                req.user=req.session.user;
                next();
            }
        }else{
            next();
        }
    }
}
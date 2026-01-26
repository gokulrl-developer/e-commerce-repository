const User=require('../models/userModel')
const {Messages}=require('../constants/messages.constants')
const {StatusCodes}=require('../constants/status-codes.constants')
module.exports={
    checkSession:async (req,res,next)=>{
        if(req.session.user){
        const user= await User.findOne({_id:req.session.user._id});
        if(user.status !== 'Active'){
         req.session.destroy((err) => {
                if (err) {
                    if(req.xhr){return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message:Messages.INTERNAL_SERVER_ERROR})
                    }else{
                  return res.render('user/user-error',{statusCode:StatusCodes.INTERNAL_SERVER_ERROR,message:Messages.INTERNAL_SERVER_ERROR});
                
                }}
                return res.redirect('/login');
            });
        }else{
            req.user=req.session.user;
            next();
        }
        }else{
            if(req.xhr){
                return res.status(401).json({message:Messages.USER_NOT_LOGGED});
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
                    return res.status(StatusCodes.UNAUTHORIZED).json({message:Messages.INTERNAL_SERVER_ERROR});
                }else{
                  return res.render('user/user-error',{statusCode:StatusCodes.INTERNAL_SERVER_ERROR,message:Messages.INTERNAL_SERVER_ERROR});
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
                        if(req.xhr){return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message:Messages.INTERNAL_SERVER_ERROR})
                        }else{
                      return res.render('user/user-error',{statusCode:StatusCodes.INTERNAL_SERVER_ERROR,message:Messages.INTERNAL_SERVER_ERROR});
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
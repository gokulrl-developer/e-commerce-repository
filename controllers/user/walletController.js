const Wallet = require('../../models/walletModel');
const mongoose = require('mongoose');
const Order = require('../../models/orderModel');
const Cart = require('../../models/cartModel');
const {StatusCodes}=require("../../constants/status-codes.constants")
const {Messages}=require("../../constants/messages.constants")

exports.getWallet = async (req, res) => {
    const {currentPage,skip,limit} =req.pagination;
    const userId = req.user._id;
    try {
        const transactionCount = await Wallet.aggregate([
            {$match:{user:new mongoose.Types.ObjectId(`${userId}`)}},
            {$unwind:"$transactions"},
            {$count:"count"}
        ]);
        const totalTransactions=transactionCount.length===1?transactionCount[0].count:0;
        const walletArray=await Wallet.aggregate([
            {$match:{user:new mongoose.Types.ObjectId(`${userId}`)}},
            {$unwind:"$transactions"},
            {$sort:{"transactions.date":-1}},
            {$skip:skip},
            {$limit:limit},
            {$group:{_id:"$_id",
             user:{$first:"$user"},
             balance:{$first:"$balance"},
             createdAt:{$first:"$createdAt"},
             updatedAt:{$first:"$updatedAt"},
             transactions:{$push:"$transactions"}
            }
        } 
        ]);
        if (walletArray.length===0) {
            const newWallet = new Wallet({ user: userId });
            await newWallet.save();
            return res.render('user/wallet', { wallet: newWallet,user:req.user,totalPages:0,currentPage:1 });
        }
        const wallet=walletArray[0];
        const totalPages = Math.max(1,Math.ceil(totalTransactions/limit));
        res.render('user/wallet', { wallet,user:req.user,totalPages,currentPage});
    } catch (error) {
        console.error(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(Messages.INTERNAL_SERVER_ERROR);
    }
};

module.exports = exports;


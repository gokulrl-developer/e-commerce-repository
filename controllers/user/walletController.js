const Wallet = require('../../models/walletModel');
const Order = require('../../models/orderModel');
const Cart = require('../../models/cartModel');

exports.getWallet = async (req, res) => {
    const userId = req.user._id;
    try {
        const wallet = await Wallet.findOne({ user: userId }).populate('transactions');
        if (!wallet) {
            const newWallet = new Wallet({ user: userId });
            await newWallet.save();
            return res.render('user/wallet', { wallet: newWallet });
        }
        
        res.render('user/wallet', { wallet,user:req.user});
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};

module.exports = exports;


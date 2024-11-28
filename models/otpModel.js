const mongoose=require('mongoose');
const otpSchema = new mongoose.Schema(
    {
      email: String,
      otp: String,
      createdAt: { type: Date, default: Date.now, expires: 60 }, // Expire after 28 seconds
    },
    { timestamps: true }
  );

  otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 }); // Ensure TTL index is set
  const Otp = mongoose.model("Otp", otpSchema);

const saveOtp = async (email, otp) => {
  const newOtp = new Otp({ email, otp });
  await newOtp.save();
};

module.exports = {
  Otp,
  saveOtp,
};
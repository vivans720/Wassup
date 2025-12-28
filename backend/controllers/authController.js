//Step 1: Send OTP

const sendOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email } = req.body;
  const otp = otpGenerate();
  const expiry = new Date(Date.now() + 5 * 60 * 1000);
  let user;
  try {
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        user = new User({ email });
      }
      user.emailOtp = otp;
      user.emailOtpExpiry = expiry;
      await user.save();

      return response(res, 200, "OTP sent successfully", { email });
    }
    if (!phoneNumber || !phoneSuffix) {
      return response(res, 400, "Phone number or phone suffix is required");
    }

    const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
    user = await User.findOne({ phoneNumber });
    if (!user) {
      user = await new User({ phoneNumber, phoneSuffix });
    }

    await user.save();

    return response(res, 200, "OTP sent successfully", user);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal Server Error");
  }
};

const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;

const client = twilio(accountSid, authToken);

const sendOtpToPhoneNumber = async (phoneNumber) => {
  try {
    console.log("Sending otp to ", phoneNumber);
    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    const response = await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        to: phoneNumber,
        channel: "sms",
      });

    console.log("This is my otp response", response);
    return response;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to send OTP");
  }
};

const verifyOtp = async (phoneNumber, otp) => {
  try {
    console.log("this is my otp", otp);
    console.log("this is my phone number", phoneNumber);
    const response = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: phoneNumber,
        code: otp,
      });

    console.log("This is my otp response", response);
    return response;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to verify OTP");
  }
};

module.exports = {
  sendOtpToPhoneNumber,
  verifyOtp,
};

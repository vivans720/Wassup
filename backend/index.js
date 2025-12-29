const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/dbConnect");
const bodyParser = require("body-parser");

const authRoute = require("./routes/authRoute");
dotenv.config();

const PORT = process.env.PORT || 8000;

const app = express();

//middleware

app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

connectDB();

//routes

app.use("/api/auth", authRoute);


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


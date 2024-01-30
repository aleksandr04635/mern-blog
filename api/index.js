const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const cookieParser = require("cookie-parser");
const authRoute = require("./routes/auth");
const userRoute = require("./routes/users");
const postRoute = require("./routes/posts");
const commentRoute = require("./routes/comments");

//database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log(
      "database is connected successfully to " + process.env.MONGO_URL
    );
  } catch (err) {
    console.log(err);
  }
};

//middlewares
dotenv.config();
app.use(express.json());
app.use("/images", express.static(path.join(__dirname, "/images")));
app.use(cors({ origin: process.env.ORIGIN, credentials: true }));
app.use(cookieParser());
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/posts", postRoute);
app.use("/api/comments", commentRoute);

//image upload
const storage = multer.diskStorage({
  destination: (req, file, fn) => {
    fn(null, "images");
  },
  filename: (req, file, fn) => {
    fn(null, req.body.img);
    // fn(null,"image1.jpg")
  },
});
const upload = multer({ storage: storage });
app.post("/api/upload", upload.single("file"), (req, res) => {
  console.log("req.file", req.file); //my
  //res.status(200).json("Image has been uploaded successfully!");//old
  res.status(200).json({
    url: `${req.file.filename}`,
  }); //my
});

const DatauriParser = require("datauri/parser");
const parser = new DatauriParser();

const formatBufferTo64 = (file) =>
  parser.format(path.extname(file.originalname).toString(), file.buffer);

const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
  secure: true,
});

const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/jpg"];
const storage2 = multer.memoryStorage();
const uploadToMemory = multer({
  storage2,
  fileFilter: function (req, file, cb) {
    if (ALLOWED_FORMATS.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Not supported file type!"), false);
    }
  },
});

const cloudinaryUpload = (file, originalname) =>
  cloudinary.uploader.upload(file, {
    public_id:
      "CloudinaryDemo/" + Date.now() + "-" + Math.round(Math.random() * 1e6),
  });
app.post(
  "/api/cloud-upload",
  uploadToMemory.single("file"),
  async (req, res) => {
    //console.log("req.file", req.file); //my
    //res.status(200).json("Image has been uploaded successfully!");//old
    //res.status(200).json({      url: `${req.file.filename}`,    }); //my
    try {
      if (!req.file) {
        throw new Error("Image is not presented!");
      }
      if (req.file.size > 1000000) {
        throw new Error("File size cannot be larger than 1MB!");
      }
      console.log("req.file:");
      console.log(req.file);
      //console.log(req.file.size);
      //console.log(req.file.originalname);
      // console.log("file before:");
      // console.log(ALLOWED_FORMATS );
      const file64 = formatBufferTo64(req.file);
      // console.log("file64 :");
      // console.log(file64.content);
      const uploadResult = await cloudinaryUpload(
        file64.content,
        req.file.originalname
      );
      console.log("uploadResult: ", uploadResult);
      //res.send('Done');
      // return res.json({cloudinaryId: uploadResult.public_id, url: uploadResult.secure_url});

      res.status(200).json({
        url: uploadResult.url,
      });
    } catch (e) {
      console.log("err:", e);
      return res.status(422).send({ message: e.message });
    }
  }
);

app.listen(process.env.PORT, () => {
  connectDB();
  console.log("app is running on localhost:" + process.env.PORT);
});

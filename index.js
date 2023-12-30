require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;
app.use(cors());

// Use body parser
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.urlencoded({ extended: true }));

// Use database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schema for collection
const Schema = mongoose.Schema;
const urlSchema = new Schema({
  original_url: { type: String, required: true, unique: true },
  short_url: { type: Number, required: true, unique: true },
});
const UrlModel = mongoose.model("Url", urlSchema);

// Endpoint
app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

// Check URL
function isValidUrl(url) {
  const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
  return urlRegex.test(url);
}

app.post(
  "/api/shorturl",
  (req, res, next) => {
    const originalUrl = req.body.url.replace(/\/$/, "");
    if (!isValidUrl(originalUrl)) {
      res.json({ error: "invalid url" });
    } else {
      req.body.url = originalUrl;
      next();
    }
  },
  async (req, res) => {
    const originalUrl = req.body.url;

    const existingUrl = await UrlModel.findOne({ original_url: originalUrl });

    if (existingUrl) {
      res.json({
        original_url: existingUrl.original_url,
        short_url: existingUrl.short_url,
      });
    } else {
      const count = await UrlModel.countDocuments({});

      const newUrl = new UrlModel({
        original_url: originalUrl,
        short_url: count + 1,
      });

      await newUrl.save();

      res.json({
        original_url: newUrl.original_url,
        short_url: newUrl.short_url,
      });
    }
  }
);

app.get("/api/shorturl/:shorturl", async (req, res) => {
  const shortUrl = req.params.shorturl;

  const existingShortUrl = await UrlModel.findOne({ short_url: shortUrl });

  if (existingShortUrl) {
    res.redirect(existingShortUrl.original_url);
  } else {
    res.json({ error: "invalid url" });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});

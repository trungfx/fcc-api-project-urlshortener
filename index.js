require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
const app = express();
const dns = require("dns");

// Basic Configuration
const port = process.env.PORT || 3000;
const mongodb_uri =
  process.env.MONGO_URI ||
  "mongodb+srv://trungdeadnow:zxcvbnm1134@cluster0.3nm3k0m.mongodb.net";
const db_name = process.env.DB_NAME || "fcc-api-project-shorturl";
const collection_name = process.env.COLLECTION_NAME || "urls";

const client = new MongoClient(mongodb_uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
async function connectToMongo() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
}

connectToMongo();
const db = client.db(db_name);
const urlCollection = db.collection(collection_name);

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

  if (!urlRegex.test(url)) {
    return false;
  }

  const protocol = url.split("://")[0];
  const hostname = url.split("://")[1].split("/")[0];

  return new Promise((resolve) => {
    dns.lookup(hostname, (error) => {
      if (error) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

app.post("/api/shorturl", async (req, res) => {
  const originalUrl = req.body.url.replace(/\/$/, "");

  if (!(await isValidUrl(originalUrl))) {
    res.json({ error: "invalid url" });
    return;
  }

  const existingUrl = await urlCollection.findOne({
    original_url: originalUrl,
  });

  if (existingUrl) {
    res.json({
      original_url: existingUrl.original_url,
      short_url: existingUrl.short_url,
    });
  } else {
    const count = await urlCollection.countDocuments({});

    const newUrl = {
      original_url: originalUrl,
      short_url: count + 1,
    };

    await urlCollection.insertOne(newUrl);

    res.json({
      original_url: newUrl.original_url,
      short_url: newUrl.short_url,
    });
  }
});

app.get("/api/shorturl/:shorturl", async (req, res) => {
  const shortUrl = req.params.shorturl;

  const existingShortUrl = await urlCollection.findOne({
    short_url: +shortUrl,
  });

  if (existingShortUrl) {
    res.redirect(existingShortUrl.original_url);
  } else {
    res.json({ error: "invalid url" });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});

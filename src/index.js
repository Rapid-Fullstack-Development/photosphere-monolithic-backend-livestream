const express = require('express');
const path = require("path");
const fs = require("fs");
const { MongoClient, ObjectId } = require('mongodb');
const cors = require("cors");

async function main() {
    
    const dbName = "backend";

    const DB_CONNECTION_STRING = process.env.DB_CONNECTION_STRING;
    if (DB_CONNECTION_STRING === undefined) {
        throw new Error(`Please set a env var DB_CONNECTION_STRING.`);
    }

    const client = new MongoClient(DB_CONNECTION_STRING);
    await client.connect();

    const db = client.db(dbName);
    const assetCollections = db.collection("assets");

    //
    // Start the REST API.
    //
    const app = express();
    app.use(cors());

    const port = 3000;
        
    app.post("/asset", async (req, res) => {
        
        const assetId = new ObjectId();
        const fileName = req.headers["file-name"];
        const contentType = req.headers["content-type"];

        const width = parseInt(req.headers["width"]);
        const height = parseInt(req.headers["height"]);

        const localFileName = path.join(__dirname, "../uploads", assetId.toString());

        await streamToStorage(localFileName, req);    

        await assetCollections.insertOne({
            _id: assetId,
            origFileName: fileName,
            contentType: contentType,
            src: `/asset?id=${assetId}`,
            thumb: `/asset?id=${assetId}`,
            width: width,
            height: height,
        });

        res.json({
            assetId: assetId,
        });
    });

    app.get("/asset", async (req, res) => {

        const assetId = req.query.id;

        const localFileName = path.join(__dirname, "../uploads", assetId);

        const asset = await assetCollections.findOne({ _id: new ObjectId(assetId) });

        res.writeHead(200, {
            "Content-Type": asset.contentType,
        });

        const fileReadStream = fs.createReadStream(localFileName);
        fileReadStream.pipe(res);
    });

    app.get("/assets", async (req, res) => {

        const skip = parseInt(req.query.skip);
        const limit = parseInt(req.query.limit);

        const assets = await assetCollections.find()
            .skip(skip)
            .limit(limit)
            .toArray();
        res.json({
            assets: assets,
        });
    });

    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`);
    });
}

main()
    .catch(err => {
        console.error(`Something went wrong.`);
        console.error(err);
        process.exit(1);
    });

//
// Streams an input stream to local file storage.
//
function streamToStorage(localFileName, inputStream) {
    return new Promise((resolve, reject) => {
        const fileWriteStream = fs.createWriteStream(localFileName);
        inputStream.pipe(fileWriteStream)
            .on("error", err => {
                reject(err);
            })
            .on("finish", () => {
                resolve();
            });
    });
}
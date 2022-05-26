const express = require('express');
const path = require("path");
const fs = require("fs");
const { MongoClient, ObjectId } = require('mongodb');

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
    const port = 3000;
        
    app.post("/asset", async (req, res) => {
        
        const assetId = new ObjectId();
        const fileName = req.headers["file-name"];
        const contentType = req.headers["content-type"];

        const localFileName = path.join(__dirname, "../uploads", assetId.toString());

        await streamToStorage(localFileName, req);    

        await assetCollections.insertOne({
            _id: assetId,
            origFileName: fileName,
            contentType: contentType,            
        });

        res.sendStatus(200);
    });

    app.get("/asset", (req, res) => {

        const fileName = req.query.fileName;

        const localFileName = path.join(__dirname, "../uploads", fileName);

        res.writeHead(200, {
            "Content-Type": "image/png",
        });

        const fileReadStream = fs.createReadStream(localFileName);
        fileReadStream.pipe(res);
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
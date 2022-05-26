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
    const assets = await assetCollections.find().toArray();
    console.log(`Inital assets:`);
    console.log(assets);

    //
    // Start the REST API.
    //
    const app = express();
    const port = 3000;
        
    app.post("/asset", (req, res) => {
        
        const fileName = req.headers["file-name"];
        const contentType = req.headers["content-type"];

        const localFileName = path.join(__dirname, "../uploads", fileName);

        const fileWriteStream = fs.createWriteStream(localFileName);
        req.pipe(fileWriteStream)
            .on("error", err => {
                console.error(`Error writing ${localFileName}`);
                console.error(err);
                res.sendStatus(500);
            })
            .on("finish", () => {
                console.log(`Done writing ${localFileName}`);
                res.sendStatus(200);
            });    
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
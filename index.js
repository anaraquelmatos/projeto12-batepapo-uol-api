import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

const app = express();
app.use(cors());
app.use(json());
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URL);

app.post("/participants", async (req, res) => {
    const body = req.body;
    const participantesNovo = {
        name: body.name,
        lastStatus: Date.now()
    }
    try {
        await mongoClient.connect();
        const database = mongoClient.db("projeto");
        await database.collection("participantes").insertOne(participantesNovo);
        res.sendStatus(201);
        mongoClient.close();
    }
    catch (e) {
        res.sendStatus(500);
        mongoClient.close();
    }
});

app.get("/participants", async (req, res) => {

    try{
        await mongoClient.connect();
        const database = mongoClient.db("projeto");
        const participantes = await database.collection("participantes").find().toArray();
        res.send(participantes);
        mongoClient.close();
    }
    catch (e){
        res.sendStatus(500);
        mongoClient.close();
    }
});

app.listen(5000);


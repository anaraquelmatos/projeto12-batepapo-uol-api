import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";

const app = express();
app.use(cors());
app.use(json());

const mongoClient = new MongoClient("mongodb://localhost:27017");

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


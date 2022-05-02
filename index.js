import express, { json } from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";

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
    const participantesSchema = joi.object({
        name: joi.string().required()
    });
    const validacao = participantesSchema.validate({ name: body.name });

    if (validacao.error) {
        res.status(422).send(validacao.error.details.map(descricao => descricao.message));
        return;
    }

    try {
        await mongoClient.connect();
        const database = mongoClient.db("projeto");
        const verificacao = await database.collection("participantes").findOne({ name: body.name });
        if (verificacao) {
            res.sendStatus(409);
            return;
        } else {
            await database.collection("participantes").insertOne(participantesNovo);
            res.sendStatus(201);
            mongoClient.close();
        }
    }
    catch (e) {
        res.sendStatus(500);
        mongoClient.close();
    }
});

app.get("/participants", async (req, res) => {

    try {
        await mongoClient.connect();
        const database = mongoClient.db("projeto");
        const participantes = await database.collection("participantes").find().toArray();
        res.send(participantes);
        mongoClient.close();
    }
    catch (e) {
        res.sendStatus(500);
        mongoClient.close();
    }
});

app.listen(5000);


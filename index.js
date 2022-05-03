import express, { json } from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

const app = express();
app.use(cors());
app.use(json());
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URL);
let database = null;
mongoClient.connect(() => {
    database = mongoClient.db("projeto");
});

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
        res.sendStatus(422);
        return;
    }

    try {
        const verificacao = await database.collection("participantes").findOne({ name: body.name });
        if (verificacao) {
            res.sendStatus(409);
            return;
        } else {
            await database.collection("participantes").insertOne(participantesNovo);
            res.sendStatus(201);
            await database.collection("mensagens").insertOne({
                from: body.name,
                to: "Todos",
                text: "entra na sala...",
                type: "status",
                time: dayjs().format("HH:mm:ss"),
            });
        }
    }
    catch (e) {
        console.log(e);
    }
});

app.get("/participants", async (req, res) => {

    try {
        const participantes = await database.collection("participantes").find({}).toArray();
        res.send(participantes);
    }
    catch (e) {
        console.log(e);
    }
});

app.post("/messages", async (req, res) => {
    const body = req.body;
    const { user } = req.headers;

    try {
        const mensagensNovo = {
            from: user,
            to: body.to,
            text: body.text,
            type: body.type,
            time: dayjs().format("HH:mm:ss")
        }
        const mesagensSchema = joi.object({
            to: joi.string().required(),
            type: joi.string().pattern(/^message|private_message$/),
            text: joi.string().required(),
            from: joi.string().valid(user)
        });
        const validacao = mesagensSchema.validateAsync({ to: body.to, text: body.text, type: body.type, from: user });

        if (validacao.error) {
            res.sendStatus(422);
            return;
        }
        const verificacao = await database.collection("participantes").findOne({ name: user });
        if (!verificacao) {
            res.sendStatus(422);
            return;
        }
        await database.collection("mensagens").insertOne(mensagensNovo);
        res.sendStatus(201);
    }
    catch (e) {
        console.log(e);
    }
});


app.listen(5000);


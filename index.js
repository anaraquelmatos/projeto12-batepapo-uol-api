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

app.get("/messages", async (req, res) => {

    const { user } = req.headers;
    let array = [];
    const limite = parseInt(req.query.limit);
    try {
        const mensagens = await database.collection("mensagens").find({}).toArray();

        for (let i = 0; i < mensagens.length; i++) {
            if (mensagens[i].type === "message" || mensagens[i].type === "status") {
                array.push(mensagens[i]);
            }
            if (mensagens[i].type === "private_message" && (mensagens[i].to === user || mensagens[i].from === user)) {
                array.push(mensagens[i]);
            }

        }

        if (!limite) {
            res.send(array);
        } else {
            const qtdMensagem = array.reverse().splice(0, limite).reverse();
            res.send(qtdMensagem);
        }
    }
    catch (e) {
        console.log(e);
    }
});

app.post("/status", async (req, res) => {
    const { user } = req.headers;
    const statusAtualizado = {
        lastStatus: Date.now()
    }

    try {
        const verificacao = await database.collection("participantes").findOne({ name: user });
        if (!verificacao) {
            res.sendStatus(404);
            return;
        }
        await database.collection("participantes").updateOne({
            name: user
        }, { $set: statusAtualizado })
        res.sendStatus(200);
    }
    catch (e) {
        console.log(e);
    }
});

setInterval(async () => {
    try {
        const verificacao = await database.collection("participantes").find({}).toArray();
        const atualizacao = Date.now();

        for (let i = 0; i < verificacao.length; i++) {
            if ((atualizacao - verificacao[i].lastStatus) > 10000) {
                await database.collection("participantes").deleteOne({ _id: new ObjectId(verificacao[i]._id) });
                await database.collection("mensagens").insertOne({
                    from: verificacao[i].name,
                    to: "Todos",
                    text: "sai na sala...",
                    type: "status",
                    time: dayjs().format("HH:mm:ss")
                });
            }
        }
    }
    catch (e) {
        console.log(e);
    }

}, 15000);

app.delete('/messages/:id', async (req, res) => {
    const { id } = req.params;
    const { user } = req.headers;

    try {
        const mensagemValida = await database.collection("mensagens").findOne({ _id: new ObjectId(id) });

        if (!mensagemValida) {
            res.sendStatus(404);
            return;
        }
        if (mensagemValida.from !== user) {
            res.sendStatus(401);
            return;
        }
        await database.collection("mensagens").deleteOne({ _id: new ObjectId(id) });
    } catch (e) {
        console.log(e);
    }
});

app.listen(5000);


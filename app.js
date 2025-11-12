import { config } from "dotenv";
import express from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import moment from "moment";

const app = express();
config();
app.use(cors());
const port = process.env.PORT || 3000;
const uri = process.env.MONGO_URI;
const DDMMYYYY = "DDMMYYYY";

// Create MongoDB client
const client = new MongoClient(uri);

// Connect once and reuse connection
let todoCollection;
let todoHistory;

async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("todo-db");
    todoCollection = db.collection("todo-collection");
    todoHistory = db.collection("todo-history");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

// Connect when server starts
await connectDB();

async function addWeekDayToDB() {
  const firstDayOfTheWeek = moment(new Date())
    .startOf("week")
    .add(2, "days")
    .clone()
    .format(DDMMYYYY);
  const today = moment(new Date()).format(DDMMYYYY);
  const dateExisits = await todoHistory
    .find({ [firstDayOfTheWeek]: { $exists: true } })
    .toArray();
  if (firstDayOfTheWeek === today && !dateExisits.length) {
    for (let i = 0; i < 7; i++) {
      const dateKey = moment(new Date())
        .startOf("week")
        .clone()
        .add(i, "days")
        .format(DDMMYYYY);

      const result = await todoHistory.insertOne({
        [dateKey]: [],
      });
      console.log(" ⇒ Document inserted with _id → ", result);
    }
  } else {
    console.log("dates already exisi");
  }
}

setInterval(addWeekDayToDB, 60 * 60 * 24 * 7);
// setInterval(addWeekDayToDB, 4000);

// GET API to fetch todos
app.get("/getTodo", async (req, res) => {
  try {
    const todos = await todoCollection.find({}).toArray();
    res.status(200).json(todos);
  } catch (err) {
    console.error("Error fetching todos:", err);
    res.status(500).send("Error fetching todos");
  }
});

app.get("/getHistory", async (req, res) => {
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    weekDays.push(
      moment(new Date()).startOf("week").add(i, "days").format(DDMMYYYY)
    );
  }

  try {
    const query = { $or: weekDays.map((k) => ({ [k]: { $exists: true } })) };
    const results = await todoHistory.find(query).toArray();
    res.status(200).json(results);
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).send("Error fetching history");
  }
});

app.get("/getHistoryPerWeek", async (req, res) => {
  try {
    // get the date a payload
    // calcualte the week
    // prepare query in a way to get only 7 documents
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).send("Error fetching history");
  }
});

// Optional: POST route to add todos
app.use(express.json());
app.post("/addTodo", async (req, res) => {
  try {
    const todo = req.body;
    const result = await todoCollection.insertOne(todo);
    res.status(201).json({ insertedId: result.insertedId });
  } catch (err) {
    console.error(" Error adding todo:", err);
    res.status(500).send("Error adding todo");
  }
});

app.post("/submitTodo", async (req, res) => {
  try {
    const todo = req.body;
    const todosDates = Object.keys(todo);

    const results = [];

    for (const item of todosDates) {
      const result = await todoHistory.updateOne(
        { [item]: { $exists: true } },
        { $set: { [item]: todo[item] } }
      );
      results.push({
        key: item,
        matched: result.matchedCount,
        modified: result.modifiedCount,
      });
    }

    res.status(200).json({
      message: "Todos updated successfully",
      results,
    });
  } catch (err) {
    console.error("Error adding todo:", err);
    res.status(500).send("Error adding todo");
  }
});

app.listen(port, () => console.log(` Server running on port ${port}`));

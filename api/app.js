import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Emergency Operations Dashboard API is running");
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
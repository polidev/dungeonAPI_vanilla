import express from "express";

const PORT = process.env.PORT || 3000;
const app = express();

app.get("/", (req, res) => {
  return res.send("Hello World!");
});

app.get("/health", (req, res) => {
  return res.json({
    status: "ok",
    uptime: process.uptime(),
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

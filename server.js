const express = require("express");
const path = require("node:path");

const app = express();
const publicDir = path.join(__dirname, "public");

app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.use(express.static(publicDir));

const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});

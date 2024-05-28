const express = require("express");
const app = express();
const port = 5007


app.get("/", (req, res) => res.send("Express on Vercel 2"));

app.listen(port, () => console.log(`Server ready on port ${port}.`));

module.exports = app;
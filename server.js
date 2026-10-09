const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.status(200).json({ status: "ok", "pipeline": "running" });
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;

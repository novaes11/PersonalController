const express = require('express');
const app = express();
app.use((req, res, next) => {
  if (req.url.startsWith('/api/index.js')) {
    req.url = req.url.replace('/api/index.js', '') || '/';
  }
  next();
});

const router = express.Router();
router.get('/', (req, res) => {
  res.status(200).json({ status: "ok", service: "PersonalController API", timestamp: new Date().toISOString() });
});
router.get('/health', (req, res) => {
  res.status(200).json({ status: "ok", "pipeline": "running" });
});

app.use('/', router);
app.use('/api', router);

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;

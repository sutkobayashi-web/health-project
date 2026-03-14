const express = require('express');
const { chatWithNurse, getNurseGreeting, chatWithNurseImage } = require('../services/ai');

const router = express.Router();

// AI保健師チャット
router.post('/message', async (req, res) => {
  const { userMessage, history, userName } = req.body;
  const result = await chatWithNurse(userMessage, history, userName);
  res.json(result);
});

// AI保健師初回挨拶
router.post('/greeting', async (req, res) => {
  const { userName } = req.body;
  const result = await getNurseGreeting(userName);
  res.json(result);
});

// AI保健師画像付きチャット
router.post('/image-message', async (req, res) => {
  const { userMessage, imageBase64, mimeType, history, userName } = req.body;
  const result = await chatWithNurseImage(userMessage, imageBase64, mimeType, history, userName);
  res.json(result);
});

module.exports = router;

/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v1/https");
const logger = require("firebase-functions/logger");
const cors = require("cors")({
  origin: [
    "https://notula.ai",
    "https://www.notula.ai",
    "https://notula.web.app",
    "https://notula-ai.web.app",
    "https://sekreai.web.app",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Content-Range",
    "Range",
    "X-Requested-With",
  ],
  credentials: true,
  maxAge: 3600,
});
const fetch = require("node-fetch");

// Import transcription API endpoints
const transcriptionApi = require("./transcriptionApi");

// DeepSeek API endpoint
const DEEPSEEK_API_ENDPOINT = "https://api.deepseek.com/v1/chat/completions";

// Get DeepSeek API key from config
const functions = require("firebase-functions");
const DEEPSEEK_API_KEY = functions.config().deepseek.api_key;

// Export transcription API endpoints
exports.createTranscription = transcriptionApi.createTranscription;
exports.getTranscriptions = transcriptionApi.getTranscriptions;
exports.getTranscription = transcriptionApi.getTranscription;
exports.updateTranscription = transcriptionApi.updateTranscription;
exports.deleteTranscription = transcriptionApi.deleteTranscription;

/**
 * Proxy untuk DeepSeek Chat API
 * Menerima request dari frontend dan meneruskannya ke DeepSeek API
 */
exports.deepseekChatProxy = onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      // Log request untuk debugging
      logger.info("DeepSeek Chat API request received", {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      // Hanya terima request POST
      if (request.method !== "POST") {
        response.status(405).send({error: "Method Not Allowed"});
        return;
      }

      // Ambil body request dari frontend
      const requestBody = request.body;

      // Pastikan model dan messages ada
      if (!requestBody.model || !requestBody.messages) {
        response.status(400).send({error: "Invalid request body"});
        return;
      }

      // Kirim request ke DeepSeek API
      const deepseekResponse = await fetch(DEEPSEEK_API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      // Ambil response dari DeepSeek API
      const responseData = await deepseekResponse.json();

      // Log response untuk debugging
      logger.info("DeepSeek API response", {
        status: deepseekResponse.status,
        data: responseData,
      });

      // Kirim response ke frontend
      response.status(deepseekResponse.status).send(responseData);
    } catch (error) {
      // Log error
      logger.error("Error in DeepSeek Chat API proxy", error);

      // Kirim error ke frontend
      response.status(500).send({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  });
});

/**
 * Proxy untuk DeepSeek Audio API
 * Menerima request dari frontend dan meneruskannya ke DeepSeek API
 */
exports.deepseekAudioProxy = onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      // Log request untuk debugging
      logger.info("DeepSeek Audio API request received", {
        method: request.method,
        headers: request.headers,
      });

      // Hanya terima request POST
      if (request.method !== "POST") {
        response.status(405).send({error: "Method Not Allowed"});
        return;
      }

      // Ambil body request dari frontend
      const requestBody = request.body;

      // Pastikan model dan file ada
      if (!requestBody.model || !requestBody.file) {
        response.status(400).send({error: "Invalid request body"});
        return;
      }

      // Kirim request ke DeepSeek Audio API
      const audioApiEndpoint = "https://api.deepseek.com/v1/audio/transcriptions";
      const deepseekResponse = await fetch(audioApiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      // Ambil response dari DeepSeek API
      const responseData = await deepseekResponse.json();

      // Log response untuk debugging
      logger.info("DeepSeek Audio API response", {
        status: deepseekResponse.status,
      });

      // Kirim response ke frontend
      response.status(deepseekResponse.status).send(responseData);
    } catch (error) {
      // Log error
      logger.error("Error in DeepSeek Audio API proxy", error);

      // Kirim error ke frontend
      response.status(500).send({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  });
});

/**
 * Generate meeting summary using DeepSeek API
 */
exports.generateSummary = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      // Log request untuk debugging
      logger.info("Generate summary request received", {
        method: req.method,
        headers: req.headers,
      });

      // Hanya terima request POST
      if (req.method !== "POST") {
        res.status(405).send({error: "Method Not Allowed"});
        return;
      }

      // Ambil text dari request body
      const {text} = req.body;
      if (!text) {
        res.status(400).send({error: "Text is required"});
        return;
      }

      // Prompt untuk generate summary
      const prompt = `
      Analisis transkrip rapat dalam bahasa Indonesia ini dan hasilkan notulen rapat yang lengkap dan terstruktur.
      
      Ekstrak dan format informasi berikut dengan jelas:

      1. Informasi Rapat:
         - Judul rapat (berdasarkan konteks)
         - Tanggal dan waktu (jika disebutkan)
         - Durasi (jika disebutkan)
         - Lokasi/Platform (jika disebutkan)

      2. Ringkasan Rapat:
         - Ringkasan singkat dan jelas dalam 2-3 paragraf
         - Fokus pada poin-poin utama dan hasil

      3. Topik yang Dibahas:
         - Daftar topik utama (maksimal 5)
         - Poin-poin penting untuk setiap topik
         - Urutan berdasarkan prioritas atau urutan diskusi

      4. Item Tindakan:
         - Daftar tugas yang jelas (maksimal 5 item)
         - Penanggung jawab untuk setiap tugas
         - Tenggat waktu spesifik (jika disebutkan)
         - Status atau prioritas (jika disebutkan)

      5. Peserta:
         - Daftar peserta yang hadir
         - Peran atau jabatan (jika disebutkan)
         - Kontribusi penting (jika ada)

      Transkrip:
      "${text}"
      
      Kembalikan hasil dalam format JSON terstruktur:
      {
        "meetingInfo": {
          "title": "Judul rapat berdasarkan konteks",
          "date": "Tanggal dan waktu rapat",
          "duration": "Durasi rapat",
          "location": "Lokasi atau platform rapat"
        },
        "summary": "Ringkasan rapat dalam 2-3 paragraf yang jelas dan terstruktur",
        "topics": [
          {
            "title": "Judul topik",
            "points": ["Poin pembahasan detail 1", "Poin pembahasan detail 2"]
          }
        ],
        "actionItems": [
          {
            "task": "Deskripsi tugas yang jelas",
            "assignee": "Penanggung jawab",
            "deadline": "Tenggat waktu spesifik",
            "status": "Status atau prioritas"
          }
        ],
        "participants": [
          {
            "name": "Nama peserta",
            "role": "Peran atau jabatan",
            "contribution": "Kontribusi penting dalam rapat"
          }
        ]
      }`;

      // Kirim request ke DeepSeek API
      const deepseekResponse = await fetch(DEEPSEEK_API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      // Ambil response dari DeepSeek API
      const responseData = await deepseekResponse.json();

      // Log response untuk debugging
      logger.info("DeepSeek API response", {
        status: deepseekResponse.status,
      });

      // Parse dan validasi response
      let summaryData;
      try {
        const content = responseData.choices[0].message.content;
        if (content.trim().startsWith("```json")) {
          const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch && jsonMatch[1]) {
            summaryData = JSON.parse(jsonMatch[1]);
          }
        } else if (content.trim().startsWith("{") && content.trim().endsWith("}")) {
          summaryData = JSON.parse(content);
        } else {
          const jsonMatch = content.match(/{[\s\S]*?}/);
          if (jsonMatch) {
            summaryData = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (error) {
        logger.error("Error parsing summary response", error);
        res.status(500).send({
          error: "Failed to parse summary response",
          message: error.message,
        });
        return;
      }

      // Validasi dan proses data summary
      if (!summaryData.meetingInfo) {
        summaryData.meetingInfo = {
          title: "Untitled Meeting",
          date: new Date().toISOString().split("T")[0],
          duration: "Tidak disebutkan",
          location: "Tidak disebutkan",
        };
      }

      if (!summaryData.summary || typeof summaryData.summary !== "string") {
        summaryData.summary = "Tidak ada ringkasan yang tersedia untuk transkrip ini.";
      }

      if (!Array.isArray(summaryData.topics) || summaryData.topics.length === 0) {
        summaryData.topics = [{
          title: "Topik Utama",
          points: ["Tidak ada poin spesifik yang teridentifikasi dalam transkrip."],
        }];
      }

      if (!Array.isArray(summaryData.actionItems) || summaryData.actionItems.length === 0) {
        summaryData.actionItems = [{
          task: "Tindak lanjut diskusi",
          assignee: "Semua peserta",
          deadline: "Segera",
          status: "Pending",
        }];
      }

      if (!Array.isArray(summaryData.participants) || summaryData.participants.length === 0) {
        summaryData.participants = [{
          name: "Peserta Rapat",
          role: "Tidak disebutkan",
          contribution: "Tidak disebutkan",
        }];
      }

      // Kirim response ke frontend
      res.status(200).send(summaryData);
    } catch (error) {
      logger.error("Error in generateSummary", error);
      res.status(500).send({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  });
});

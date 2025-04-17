/**
 * API endpoints for transcription CRUD operations
 */

const {onRequest} = require("firebase-functions/v1/https");
const logger = require("firebase-functions/logger");
const cors = require("cors")({
  origin: ["https://notula.ai", "https://www.notula.ai", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});
const admin = require("./admin");
const fetch = require("node-fetch");
const functions = require("firebase-functions");
const OpenAI = require("openai");

const db = admin.firestore();
const openai = new OpenAI({
  apiKey: functions.config().openai.api_key,
});

/**
 * Create a new transcription
 * POST /api/transcriptions
 */
exports.createTranscription = onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      // Log request for debugging
      logger.info("Create transcription request received", {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      // Only accept POST requests
      if (request.method !== "POST") {
        response.status(405).send({error: "Method Not Allowed"});
        return;
      }

      // Verify authentication
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        response.status(401).send({error: "Unauthorized"});
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;

      // Get request body
      const transcriptionData = request.body;

      // Validate required fields
      if (!transcriptionData.title || !transcriptionData.content) {
        response.status(400).send({error: "Missing required fields"});
        return;
      }

      // Handle Lightsail Storage URL if provided
      if (transcriptionData.lightsailKey) {
        try {
          // Verify the lightsailKey is valid and belongs to the user
          const lightsailRef = db.collection("lightsail_storage")
            .where("userId", "==", userId)
            .where("key", "==", transcriptionData.lightsailKey)
            .limit(1);

          const lightsailDoc = await lightsailRef.get();
          if (lightsailDoc.empty) {
            logger.warn("Invalid Lightsail Storage key", {
              userId: userId,
              key: transcriptionData.lightsailKey,
            });
            delete transcriptionData.lightsailKey;
          }
        } catch (error) {
          logger.error("Error verifying Lightsail Storage key", error);
          delete transcriptionData.lightsailKey;
        }
      }

      // Add metadata
      const newTranscription = {
        ...transcriptionData,
        userId: userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: transcriptionData.status || "completed",
        tags: transcriptionData.tags || [],
        folder: transcriptionData.folder || "Uncategorized",
      };

      // Save to Firestore
      const docRef = await db.collection("transcriptions").add(newTranscription);

      // Return success response
      response.status(201).send({
        id: docRef.id,
        ...newTranscription,
      });
    } catch (error) {
      // Log error
      logger.error("Error creating transcription", error);

      // Send error response
      response.status(500).send({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  });
});

/**
 * Get all transcriptions for a user
 * GET /api/transcriptions
 */
exports.getTranscriptions = onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      // Log request for debugging
      logger.info("Get transcriptions request received", {
        method: request.method,
        headers: request.headers,
        query: request.query,
      });

      // Only accept GET requests
      if (request.method !== "GET") {
        response.status(405).send({error: "Method Not Allowed"});
        return;
      }

      // Verify authentication
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        response.status(401).send({error: "Unauthorized"});
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;

      // Query parameters
      const limit = parseInt(request.query.limit) || 50;
      const folder = request.query.folder;
      const tag = request.query.tag;
      const searchQuery = request.query.search;

      // Build query
      let query = db.collection("transcriptions")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(limit);

      // Apply filters if provided
      if (folder) {
        query = query.where("folder", "==", folder);
      }

      if (tag) {
        query = query.where("tags", "array-contains", tag);
      }

      // Execute query
      const querySnapshot = await query.get();

      // Process results
      let transcriptions = [];
      querySnapshot.forEach((doc) => {
        transcriptions.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // Apply search filter if provided (client-side filtering since Firestore doesn't support full-text search)
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        transcriptions = transcriptions.filter((t) =>
          t.title.toLowerCase().includes(lowerQuery) ||
          t.content.toLowerCase().includes(lowerQuery),
        );
      }

      // Return success response
      response.status(200).send({
        transcriptions: transcriptions,
      });
    } catch (error) {
      // Log error
      logger.error("Error getting transcriptions", error);

      // Send error response
      response.status(500).send({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  });
});

/**
 * Get a single transcription by ID
 * GET /api/transcriptions/:id
 */
exports.getTranscription = onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      // Log request for debugging
      logger.info("Get transcription request received", {
        method: request.method,
        headers: request.headers,
        path: request.path,
      });

      // Only accept GET requests
      if (request.method !== "GET") {
        response.status(405).send({error: "Method Not Allowed"});
        return;
      }

      // Verify authentication
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        response.status(401).send({error: "Unauthorized"});
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;

      // Extract transcription ID from path
      const pathParts = request.path.split("/");
      const transcriptionId = pathParts[pathParts.length - 1];

      if (!transcriptionId) {
        response.status(400).send({error: "Transcription ID is required"});
        return;
      }

      // Get transcription from Firestore
      const docRef = db.collection("transcriptions").doc(transcriptionId);
      const doc = await docRef.get();

      if (!doc.exists) {
        response.status(404).send({error: "Transcription not found"});
        return;
      }

      const transcriptionData = doc.data();

      // Verify ownership
      if (transcriptionData.userId !== userId) {
        response.status(403).send({error: "Forbidden"});
        return;
      }

      // Return success response
      response.status(200).send({
        id: doc.id,
        ...transcriptionData,
      });
    } catch (error) {
      // Log error
      logger.error("Error getting transcription", error);

      // Send error response
      response.status(500).send({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  });
});

/**
 * Update a transcription
 * PUT /api/transcriptions/:id
 */
exports.updateTranscription = onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      // Log request for debugging
      logger.info("Update transcription request received", {
        method: request.method,
        headers: request.headers,
        path: request.path,
        body: request.body,
      });

      // Only accept PUT requests
      if (request.method !== "PUT") {
        response.status(405).send({error: "Method Not Allowed"});
        return;
      }

      // Verify authentication
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        response.status(401).send({error: "Unauthorized"});
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;

      // Extract transcription ID from path
      const pathParts = request.path.split("/");
      const transcriptionId = pathParts[pathParts.length - 1];

      if (!transcriptionId) {
        response.status(400).send({error: "Transcription ID is required"});
        return;
      }

      // Get transcription from Firestore
      const docRef = db.collection("transcriptions").doc(transcriptionId);
      const doc = await docRef.get();

      if (!doc.exists) {
        response.status(404).send({error: "Transcription not found"});
        return;
      }

      const transcriptionData = doc.data();

      // Verify ownership
      if (transcriptionData.userId !== userId) {
        response.status(403).send({error: "Forbidden"});
        return;
      }

      // Get update data
      const updateData = request.body;

      // Prevent updating certain fields
      delete updateData.userId;
      delete updateData.createdAt;

      // Add metadata
      updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      // Update in Firestore
      await docRef.update(updateData);

      // Get updated document
      const updatedDoc = await docRef.get();
      const updatedData = updatedDoc.data();

      // Return success response
      response.status(200).send({
        id: updatedDoc.id,
        ...updatedData,
      });
    } catch (error) {
      // Log error
      logger.error("Error updating transcription", error);

      // Send error response
      response.status(500).send({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  });
});

/**
 * Delete a transcription
 * DELETE /api/transcriptions/:id
 */
exports.deleteTranscription = onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      // Log request for debugging
      logger.info("Delete transcription request received", {
        method: request.method,
        headers: request.headers,
        path: request.path,
      });

      // Only accept DELETE requests
      if (request.method !== "DELETE") {
        response.status(405).send({error: "Method Not Allowed"});
        return;
      }

      // Verify authentication
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        response.status(401).send({error: "Unauthorized"});
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;

      // Extract transcription ID from path
      const pathParts = request.path.split("/");
      const transcriptionId = pathParts[pathParts.length - 1];

      if (!transcriptionId) {
        response.status(400).send({error: "Transcription ID is required"});
        return;
      }

      // Get transcription from Firestore
      const docRef = db.collection("transcriptions").doc(transcriptionId);
      const doc = await docRef.get();

      if (!doc.exists) {
        response.status(404).send({error: "Transcription not found"});
        return;
      }

      const transcriptionData = doc.data();

      // Verify ownership
      if (transcriptionData.userId !== userId) {
        response.status(403).send({error: "Forbidden"});
        return;
      }

      // Delete from Firestore
      await docRef.delete();

      // Return success response
      response.status(200).send({
        message: "Transcription deleted successfully",
        id: transcriptionId,
      });
    } catch (error) {
      // Log error
      logger.error("Error deleting transcription", error);

      // Send error response
      response.status(500).send({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  });
});

/**
 * Transcribe audio and create a transcription
 * POST /api/transcriptions/transcribe
 */
exports.transcribeAudio = onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      // Log request for debugging
      logger.info("Transcribe audio request received", {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      // Only accept POST requests
      if (request.method !== "POST") {
        response.status(405).send({error: "Method Not Allowed"});
        return;
      }

      // Verify authentication
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        response.status(401).send({error: "Unauthorized"});
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;

      // Get request body
      const audioUrl = request.body.audioUrl;

      if (!audioUrl) {
        response.status(400).send({error: "Audio URL is required"});
        return;
      }

      // Fetch audio blob
      const audioBlob = await fetch(audioUrl)
        .then((response) => response.blob());

      // Create transcription
      const transcriptionResult = await openai.createTranscription(
        audioBlob,
        "whisper-1",
        "text",
        "en",
      );

      // Get transcription data
      const transcriptionData = {
        userId: userId,
        title: transcriptionResult.data.text,
        content: transcriptionResult.data.text,
        status: "completed",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        tags: [],
        folder: "Uncategorized",
      };

      // Save to Firestore
      const docRef = await db.collection("transcriptions").add(transcriptionData);

      // Return success response
      response.status(201).send({
        id: docRef.id,
        ...transcriptionData,
      });
    } catch (error) {
      // Log error
      logger.error("Error transcribing audio", error);

      // Send error response
      response.status(500).send({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  });
});

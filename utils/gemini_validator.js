import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Converts a local file path to a GenerativePart object for Gemini API.
 * @param {string} path - The local path to the file.
 * @param {string} mimeType - The MIME type of the file.
 * @returns {object} GenerativePart object for the API.
 */
function fileToGenerativePart(path, mimeType) {
  if (!fs.existsSync(path)) {
    throw new Error(`File not found: ${path}`);
  }
  return {
    inlineData: {
      data: fs.readFileSync(path).toString("base64"),
      mimeType,
    },
  };
}

/**
 * Validates a user report and image using Gemini AI.
 * @param {string} text - The user's report description.
 * @param {string} imagePath - The file path to the proof image.
 * @returns {Promise<boolean>} True if report is valid, false otherwise.
 */
export async function validateReportAI(text, imagePath) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const mimeType = "image/png";
    const imagePart = fileToGenerativePart(imagePath, mimeType);

    const prompt = `
You are a strict content-moderation AI.

Task:
- Read the user's report description.
- Look at the image.
- Decide if the report is VALID evidence.

Return ONLY a JSON object like this:
{
  "isValid": true,
  "reason": ""
}

Do NOT return anything else. NO extra text or code fences.
`;

    const result = await model.generateContent([prompt, text]);

    let outputText = (await result.response.text()).trim();

    // 🔹 Strip Markdown code fences if present
    outputText = outputText
      .replace(/^```(json)?/, "")
      .replace(/```$/, "")
      .trim();

    console.log("AI raw output after cleanup:", outputText);

    // Parse JSON safely
    let parsed;
    try {
      parsed = JSON.parse(outputText);
    } catch (err) {
      console.error("Failed to parse AI JSON:", err);
      return { isValid: false, reason: "AI parsing failed" };
    }

    return {
      isValid: !!parsed.isValid,
      reason: parsed.reason || "",
    };
  } catch (err) {
    console.error("Gemini error:", err);
    return { isValid: false, reason: "AI error" };
  }
}

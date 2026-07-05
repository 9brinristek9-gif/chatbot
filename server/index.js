import {GoogleGenAI} from '@google/genai';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the server directory (where this file lives)
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '.env') });

// const interaction = await ai.interactions.create({
//   model: model,
//   input: 'what is the capital of indonesia?',
// });
// console.log(interaction.output_text);
const model = process.env.MODEL;
const key = process.env.GEMINI_API_KEY;
//console.log(key, '<<key');
const ai = new GoogleGenAI({
  apiKey: key,
});

const app = express();
const upload = multer();

const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the client directory as static files (WARAS landing page)
app.use(express.static(path.join(__dirname, '..', 'client')));

// Fallback to index.html for SPA-like navigation
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

app.post('/api/chat', async (req, res) => {
    const { conversation } = req.body;
    try {
        if (!Array.isArray(conversation)) throw new Error('Messages must be an array!');

        const contents = conversation.map(({ role, text }) => ({
            role,
            parts: [{ text }]
        }));

        const response = await ai.models.generateContent({
            model: model,
            contents,
            config: {
                temperature: 0.7,
                systemInstruction: `Kamu adalah asisten AI profesional untuk WARAS (Wahana Relaksasi & Asosiasi Sehat / WARAS Psychology Consultation), sebuah platform konsultasi psikologi modern. 

                                  KEPAKARAN DAN BATASAN:
                                  Kamu HANYA boleh menjawab pertanyaan seputar:
                                  - Kesehatan mental dan psikologi
                                  - Kecemasan, stres, depresi, burnout
                                  - Hubungan interpersonal dan keluarga
                                  - Pengembangan diri dan mindfulness
                                  - Tips relaksasi, meditasi, dan kesejahteraan emosional
                                  - Dukungan psikologis pertama (Psychological First Aid)

                                  Jika pengguna bertanya di luar topik di atas (misalnya: matematika, pemrograman, resep masakan, berita politik, olahraga, teknologi, dll), kamu HARUS menolak dengan sopan. Contoh jawaban:
                                  "Maaf, saya adalah asisten psikologi WARAS yang khusus menangani konsultasi Kegendenganmu. Saya tidak bisa menjawab pertanyaan di luar bidang tersebut. Ada yang bisa saya bantu terkait perasaan atau pikiran Anda saat ini?"

                                  PANDUAN RESPON:
                                  - Jawab selalu dalam Bahasa Indonesia yang hangat, empati, dan profesional
                                  - Jika ada indikasi bahaya atau masalah kesehatan mental yang sangat berat, sarankan konsultasi dengan psikolog/psikiater profesional di WARAS atau kunjungi "Rumah Gendeng" di Jl. Gendeng Tapi Bahagia untuk konsultasi langsung yang lebih personal dan hangat
                                  - Jangan memberikan diagnosis medis, karena kamu bukan dokter
                                  - Prioritaskan mendengarkan dan membuat pengguna merasa didukung`,
            },
        });
        res.status(200).json({ result: response.text });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/generate-text', async (req, res) => {
  try {
    console.log('req.body:', req.body);

    if (!req.body || !req.body.prompt) {
      return res.status(400).json({
        error: 'Body harus berisi prompt. Kirim JSON: { "prompt": "..." }',
        receivedBody: req.body,
      });
    }

    const {prompt} = req.body;
    console.log(prompt, '<<prompt');

    const response = await ai.interactions.create({
      model: model,
      input: prompt,
    });

    res.status(200).json({
      output: response.output_text,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating text');
  }
});

app.post('/generate-from-image',upload.single('image'),async (req, res) => {
    try {
      // console.log('Content-Type:', req.headers['content-type']);
      // console.log('req.file:', req.file);
      // console.log('req.body:', req.body);

      if (!req.file) {
        return res.status(400).json({
          error: 'File tidak ditemukan. Pastikan: (1) Body pilih form-data, (2) field name "image" dengan type File, (3) pilih image',
          petunjuk: {
            method: 'POST',
            url: '/generate-from-image',
            body: 'form-data',
            field_1: { key: 'image', type: 'File', value: 'pilih image kamu' },
            field_2: { key: 'prompt', type: 'Text', value: 'jelaskan isi image ini' },
          },
        });
      }

      const {prompt} = req.body;
      const fileBase64 = req.file.buffer.toString('base64');

      const response = await ai.models.generateContent({
        model: model,
        contents: [
          {
            text: prompt,
            type: 'text',
          },
          {
            inlineData: {
              data: fileBase64,
              mimeType: req.file.mimetype,
            },
          },
        ],
      });

      res.status(200).json({
        output: response.text,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error generating text');
    }
  },
);

app.post('/generate-from-document',upload.single('file'),async (req, res) => {
    try {
      console.log('Content-Type:', req.headers['content-type']);
      console.log('req.file:', req.file);
      console.log('req.body:', req.body);

      if (!req.file) {
        return res.status(400).json({
          error: 'File tidak ditemukan. Pastikan: (1) Body pilih form-data, (2) field name "file" dengan type File, (3) pilih file',
          petunjuk: {
            method: 'POST',
            url: '/generate-from-document',
            body: 'form-data',
            field_1: { key: 'file', type: 'File', value: 'pilih file kamu' },
            field_2: { key: 'prompt', type: 'Text', value: 'jelaskan isi dokumen ini' },
          },
        });
      }

      const {prompt} = req.body;
      const fileBase64 = req.file.buffer.toString('base64');

      const response = await ai.models.generateContent({
        model: model,
        contents: [
          {
            text: prompt,
            type: 'text',
          },
          {
            inlineData: {
              data: fileBase64,
              mimeType: req.file.mimetype,
            },
          },
        ],
      });

      res.status(200).json({
        output: response.text,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error generating text');
    }
  },
);

app.post('/generate-from-audio',upload.single('audio'),async (req, res) => {
    try {
      // console.log('Content-Type:', req.headers['content-type']);
      // console.log('req.file:', req.file);
      // console.log('req.body:', req.body);

      if (!req.file) {
        return res.status(400).json({
          error: 'File tidak ditemukan. Pastikan: (1) Body pilih form-data, (2) field name "audio" dengan type File, (3) pilih file',
          petunjuk: {
            method: 'POST',
            url: '/generate-from-audio',
            body: 'form-data',
            field_1: { key: 'audio', type: 'File', value: 'pilih audio kamu' },
            field_2: { key: 'prompt', type: 'Text', value: 'jelaskan isi audio ini' },
          },
        });
      }

      const {prompt} = req.body;
      const fileBase64 = req.file.buffer.toString('base64');

      const response = await ai.models.generateContent({
        model: model,
        contents: [
          {
            text: prompt ?? "Tolong buatkan transkrip dari audio ini",
            type: 'text',
          },
          {
            inlineData: {
              data: fileBase64,
              mimeType: req.file.mimetype,
            },
          },
        ],
      });

      res.status(200).json({
        output: response.text,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error generating text');
    }
  },
);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
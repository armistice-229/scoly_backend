const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const dotenv = require('dotenv');


dotenv.config();
const app = express();

// Domaine de ton frontend (exemple : https://mon-frontend.com)
const FRONTEND_URL = "https://scoly.onrender.com";

app.use(cors({
  origin: FRONTEND_URL,    // ✅ seul ce domaine est accepté
  methods: ["GET", "POST", "PUT", "DELETE"], // méthodes autorisées
  credentials: true        // si tu utilises cookies/token
}));


// Middleware
app.use(express.json());

// Connection à la base de données MongoDB
connectDB();

// Routes
const certificatRoutes = require('./routes/certificat');
app.use('/api/certificat', certificatRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));

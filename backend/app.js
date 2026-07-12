const express = require("express");
const path = require("path");

require("dotenv").config();

const corsMiddleware = require("./config/cors");
const apiRoutes = require("./api/v1/routes/apiRoutes");
const SchedulerService = require("./services/SchedulerService");
const logger = require("./utils/logger");
const errorHandler = require("./api/v1/middlewares/errorHandler");
const notFound = require("./api/v1/middlewares/notFound");

const app = express();
const PORT = process.env.PORT || process.env.APP_PORT || 3000;

// Event listener
require("./listeners/bookingListener");

// Jangan jalankan scheduler di Vercel
if (!process.env.VERCEL) {
    SchedulerService.start();
}

app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser sederhana
app.use((req, res, next) => {
    req.cookies = {};

    if (req.headers.cookie) {
        req.headers.cookie.split(";").forEach(cookie => {
            const parts = cookie.split("=");

            if (parts.length === 2) {
                req.cookies[parts[0].trim()] = decodeURIComponent(parts[1].trim());
            }
        });
    }

    next();
});

// Upload directory
const uploadDir = process.env.VERCEL
    ? "/tmp/backend/uploads"
    : path.join(__dirname, "uploads");

app.use("/uploads", express.static(uploadDir));

// Frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// API
app.use("/api/v1", apiRoutes);

// API Docs
app.get("/api/docs", (req, res) => {
    res.sendFile(path.join(__dirname, "../docs/API.html"));
});

// 404 API
app.use("/api/*", notFound);

// Frontend SPA
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/customer/index.html"));
});

// Error Handler
app.use(errorHandler);

// Jalankan server hanya di local
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        logger.info(
            `ArenaGo running on port ${PORT} (${process.env.APP_ENV || "development"})`
        );
    });
}

// Penting untuk Vercel
module.exports = app;
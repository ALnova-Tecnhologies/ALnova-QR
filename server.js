const express = require("express");
const path = require("path");
const QRCode = require("qrcode");
require("dotenv").config();

const app = express();
const PORT = 3500;

// Permitir recibir JSON
app.use(express.json());

app.get("/api/config", (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL || "https://imbpzgrltibnvnulabaf.supabase.co",
        supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || ""
    });
});

// Archivos de la web
app.use(express.static(path.join(__dirname, "public")));

// Archivos de ALnova
app.use("/assets", express.static(path.join(__dirname, "assets")));

function renderQrSvg(qr, size, darkColor, lightColor, shape) {
    const margin = 2;
    const moduleSize = qr.modules.size;
    const viewSize = moduleSize + margin * 2;
    const modules = [];

    for (let row = 0; row < moduleSize; row += 1) {
        for (let column = 0; column < moduleSize; column += 1) {
            if (!qr.modules.get(row, column)) {
                continue;
            }

            const x = column + margin;
            const y = row + margin;

            if (shape === "circle") {
                modules.push(`<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.5"/>`);
            } else {
                const radius = shape === "rounded" ? "0.28" : "0";
                modules.push(`<rect x="${x}" y="${y}" width="1" height="1" rx="${radius}"/>`);
            }
        }
    }

    return `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${viewSize} ${viewSize}"><rect width="100%" height="100%" fill="${lightColor}"/><g fill="${darkColor}">${modules.join("")}</g></svg>`
    )}`;
}

// API para generar QR
app.post("/api/qr", async (req, res) => {
    try {
        const { text, color, background, size, shape, margin } = req.body;

        if (!text) {
            return res.status(400).json({
                error: "No se recibió ningún texto o URL."
            });
        }

        const qr = QRCode.create(text, {
            errorCorrectionLevel: "H"
        });
        const qrDataUrl = renderQrSvg(
            qr,
            Number(size) || 350,
            color || "#111111",
            background || "#ffffff",
            shape || "square"
        );

        res.json({
            qr: qrDataUrl,
            modules: qr.modules.size,
            data: qr.modules.data,
            shape: shape || "square"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "No se pudo generar el código QR."
        });
    }
});

app.listen(PORT, () => {
    console.log(`ALnova QR funcionando en http://localhost:${PORT}`);
});
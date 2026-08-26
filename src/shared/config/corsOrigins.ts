// Single source of truth for allowed browser origins, shared by the Express
// CORS middleware (app.ts) and the Socket.IO server (socket/index.ts).
//
// localhost:5173 is always allowed so local development keeps working with
// no configuration. CORS_EXTRA_ORIGINS lets a dev add a fixed origin (e.g. a
// Cloudflare Tunnel hostname, see QuizAnalytics_Local_Live_Quiz_Dev_Setup)
// without touching code — just unset it to fall back to localhost.
//
// Outside production we also allow any localhost/private-LAN origin
// regardless of port, since Vite's dev port shifts when 5173 is taken and
// testing Live Quiz from a phone means hitting the dev machine's LAN IP
// directly (e.g. http://192.168.1.23:5174, or a 172.16-31.x Hyper-V/WSL
// vEthernet address on Windows), plus any *.trycloudflare.com quick-tunnel
// hostname (these are random and change every `cloudflared` restart, so
// they can't be pinned via CORS_EXTRA_ORIGINS — see
// QuizAnalytics_Local_Live_Quiz_Dev_Setup §15 on quick vs. named tunnels).
const DEFAULT_ORIGINS = ["http://localhost:5173", "https://mfquiz-web.fly.dev"];

const PRIVATE_LAN_ORIGIN = new RegExp(
    "^https?://(" +
        "localhost|127\\.0\\.0\\.1|" +
        "10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}|" +
        "172\\.(1[6-9]|2\\d|3[0-1])\\.\\d{1,3}\\.\\d{1,3}|" +
        "192\\.168\\.\\d{1,3}\\.\\d{1,3}" +
        ")(:\\d+)?$"
);

const CLOUDFLARE_QUICK_TUNNEL_ORIGIN = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/;

function extraOrigins(): string[] {
    return (process.env.CORS_EXTRA_ORIGINS || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
}

export function resolveAllowedOrigins(): string[] {
    return [...DEFAULT_ORIGINS, ...extraOrigins()];
}

export function isOriginAllowed(origin: string): boolean {
    if (resolveAllowedOrigins().includes(origin)) return true;
    if (process.env.NODE_ENV !== "production") {
        if (PRIVATE_LAN_ORIGIN.test(origin)) return true;
        if (CLOUDFLARE_QUICK_TUNNEL_ORIGIN.test(origin)) return true;
    }
    return false;
}

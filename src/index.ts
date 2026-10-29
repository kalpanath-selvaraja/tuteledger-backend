import "dotenv/config";
import app from "./app";

console.log("index.ts loaded");

const PORT = Number(process.env.PORT) || 5000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
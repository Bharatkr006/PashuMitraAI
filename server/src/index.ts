import { createApp } from "./app.js";

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`🚀 PashuMitra server running on port ${PORT}`);
  console.log(`👉 http://localhost:${PORT}`);
});

import app from './src/app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 7700;

app.listen(PORT, () => {
  console.log(`✅ Server running locally at http://localhost:${PORT}`);
});

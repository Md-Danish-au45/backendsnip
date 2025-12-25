import { getAddressByMobile } from "./src/services/gridLinesService.js";
const mockData = {
  "phone": "+919297535809",
  "full_name": "RUBY",
  "consent": "Y"
}


const run = async () => {
  try {
    const result = await getAddressByMobile(mockData);
    console.log("✅ API Result:", result);
  } catch (error) {
    console.error("❌ API Error:", error.message);
  }
};

run(); // <- this is what you were missing
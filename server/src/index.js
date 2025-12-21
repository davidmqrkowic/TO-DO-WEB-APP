import "dotenv/config";
import app from "./app.js";
import { sequelize } from "./config/db.js";
import { initModels } from "./models/index.js";

const PORT = process.env.PORT || 4001;

async function start() {
  try {

    await sequelize.authenticate();
    console.log("Database connected");

        initModels();

    await sequelize.sync({ alter: true });
    console.log("Database synced");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

start();

import mongoose from "mongoose";
import { config } from "./app.config";

const connectDatabase = async () => {
  try {
    await mongoose.connect(config.MONGO_URI)
    console.log("CONNECTED TO MONGOdB");
  } catch (error) {
    console.log("ERROR CONNECTING TO MONGOdB");
    process.exit
  }
}

export default connectDatabase
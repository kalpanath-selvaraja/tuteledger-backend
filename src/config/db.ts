import mongoose  from "mongoose";

export const connectDB =() => {
    const MONGO_URL = process.env.MONGO_URL || ""

    mongoose
    .connect(MONGO_URL)
    .then(() => console.log("DB Connected ...!"))
    .catch((err) => console.log("Fail to connect BD ..!" , err));
}


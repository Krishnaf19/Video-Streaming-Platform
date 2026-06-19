import express, { Router } from "express"
import cookieParser from "cookie-parser";
import cors from "cors"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(express.json({limit: "16kb"})); 
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"))
app.use(cookieParser())


app.get("/test", (req,res)=>{
    res.send("Working krishna")
})


//route import
import router from './routes/user.routes.js'

//route define
app.use("/api/v1/users", router)                  //note: we are using 'use' because now route is present in another folder , therefore to call it we need to use middleware called as 'use'

export { app }
 
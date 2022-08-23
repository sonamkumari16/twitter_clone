const express=require('express');
const app=express();
const router=express.Router();
const bodyParser=require("body-parser");
const db=require('./../config/dbconfig');

router.get('/',(req,res,next)=>{

})

router.post('/',async (req,res,next)=>{

    if(!req.body.content){
        console.log("content missing!");
        return res.sendStatus(400);
    }
    res.status(200).send("it worked");
})

module.exports=router;
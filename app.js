const express=require('express');
const path=require('path');
const {engine} = require('express-handlebars');
const app=express();
app.engine('hbs', engine({ 
    extname: 'hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    partialsDir: path.join(__dirname, 'views', 'partials')
 }));
app.set('view engine', 'hbs');
app.get('/',(req,res)=>{
    res.render('index')
})
app.listen(8000,()=>{
    console.log("...server starts running")
})

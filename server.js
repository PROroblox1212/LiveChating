// server.js
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import http from 'http';
import { Server } from 'socket.io';

// ---------------- Supabase Key cachée ----------------
const _k = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJicW5xb3J1ZWJidnRpY2pjeXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0ODYxOTYsImV4cCI6MjA3MTA2MjE5Nn0.Zy_1L1aIZmxEbgakFf1DXDXVccOwdnveaT-ueoomrRs';
const _o = _k.split('').map(c => c.charCodeAt(0)+3).join('-');
function _d(s){return String.fromCharCode(...s.split('-').map(n=>parseInt(n)-3));}

const supabase = createClient(
  'https://bbqnqoruebbvticjcyvc.supabase.co',
  _d(_o)
);

// ---------------- Express ----------------
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // sert le frontend

// ---------------- Routes ----------------

// Register
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashed = bcrypt.hashSync(password, 10);

  const { data, error } = await supabase
    .from('Acounts') // <-- ta table
    .insert([{ username, password: hashed }]);

  if(error) return res.status(400).json({ success:false, message:error.message });
  res.json({ success:true, userId:data[0].id, username:data[0].username });
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const { data, error } = await supabase
    .from('Acounts') // <-- ta table
    .select('*')
    .eq('username', username)
    .single();

  if(error || !data) return res.status(404).json({ success:false, message:'Utilisateur non trouvé' });

  if(bcrypt.compareSync(password, data.password)){
    const tag = username.toLowerCase() === 'alexis' ? '⭐' : '';
    res.json({ success:true, userId:data.id, username:data.username, tag });
  } else {
    res.status(401).json({ success:false, message:'Mot de passe incorrect' });
  }
});

// Get all messages
app.get('/messages', async (req,res) => {
  const { data, error } = await supabase
    .from('messages')
    .select('id,message,created_at,user_id')
    .order('created_at',{ ascending:true });

  if(error) return res.status(400).json([]);
  res.json(data);
});

// ---------------- Socket.io ----------------
io.on('connection', (socket) => {
  console.log('Un utilisateur est connecté');

  socket.on('sendMessage', async ({ userId, username, message }) => {
    const { data, error } = await supabase
      .from('messages')
      .insert([{ user_id:userId, message }]);

    if(!error) {
      io.emit('newMessage', { 
        id:data[0].id,
        user_id:userId, 
        username, 
        message:data[0].message, 
        created_at:data[0].created_at 
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Un utilisateur est déconnecté');
  });
});

// ---------------- Start server ----------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});

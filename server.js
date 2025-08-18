import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import http from 'http';
import { Server } from 'socket.io';

// Supabase client
const supabase = createClient(
  'https://bbqnqoruebbvticjcyvc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJicW5xb3J1ZWJidnRpY2pjeXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0ODYxOTYsImV4cCI6MjA3MTA2MjE5Nn0.Zy_1L1aIZmxEbgakFf1DXDXVccOwdnveaT-ueoomrRs'
);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ------------------ Auth ------------------

// Register
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).json({ success:false, message:'Remplis tous les champs.' });

  const { data: existData } = await supabase.from('Acounts').select('*').eq('username', username).single();
  if(existData) return res.status(400).json({ success:false, message:'Nom déjà utilisé.' });

  const hashed = bcrypt.hashSync(password, 10);
  const { data, error } = await supabase.from('Acounts').insert([{ username, password: hashed }]).select();
  if(error) return res.status(500).json({ success:false, message:'Impossible de créer le compte.' });

  res.json({ success:true, username:data[0].username, id:data[0].id });
});

// Login
app.post('/login', async (req,res) => {
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).json({ success:false, message:'Remplis tous les champs.' });

  const { data, error } = await supabase.from('Acounts').select('*').eq('username', username).single();
  if(error || !data) return res.status(404).json({ success:false, message:'Utilisateur non trouvé' });

  if(bcrypt.compareSync(password, data.password)){
    const special = (data.id === 1); // id = 1 => fond et tag spécial
    res.json({ success:true, username:data.username, special });
  } else {
    res.status(401).json({ success:false, message:'Mot de passe incorrect' });
  }
});

// Get all messages
app.get('/messages', async (req,res) => {
  const { data, error } = await supabase.from('messages').select('*');
  if(error) return res.status(500).json([]);
  res.json(data);
});

// ---------------- Socket.io ----------------
io.on('connection', (socket) => {
  console.log('Un utilisateur est connecté');

  socket.on('sendMessage', async ({ username, message }) => {
    if(!message) return;

    const { data, error } = await supabase.from('messages').insert([{ username, message }]).select();
    if(error) return console.log('Erreur insertion message:', error.message);

    io.emit('newMessage', { username, message: data[0].message });
  });

  socket.on('disconnect', () => console.log('Un utilisateur est déconnecté'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serveur lancé sur http://localhost:${PORT}`));

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import bodyParser from 'body-parser';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import bcrypt from 'bcryptjs';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const supabaseUrl = 'https://YOUR_PROJECT.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// -------- REGISTER --------
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const { data } = await supabase.from('Acounts').select('*').eq('username', username);
  if (data.length) return res.json({ success: false, message: 'Username already exists' });
  const hash = bcrypt.hashSync(password, 10);
  const { error } = await supabase.from('Acounts').insert([{ username, password: hash, role: 'member' }]);
  if (error) return res.json({ success: false, message: error.message });
  res.json({ success: true, username, role: 'member' });
});

// -------- LOGIN --------
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const { data } = await supabase.from('Acounts').select('*').eq('username', username).single();
  if (!data) return res.json({ success: false, message: 'User not found' });
  const valid = bcrypt.compareSync(password, data.password);
  if (!valid) return res.json({ success: false, message: 'Incorrect password' });
  res.json({ success: true, username, role: data.role });
});

// -------- MESSAGES --------
let messages = [];
io.on('connection', (socket) => {
  socket.on('sendMessage', async (msg) => {
    // Owner commands
    if (msg.role === 'owner' && msg.message.startsWith('/mod ')) {
      const target = msg.message.split(' ')[1];
      await supabase.from('Acounts').update({ role: 'mod' }).eq('username', target);
      io.emit('sendSystem', `${target} has been promoted to Mod!`);
      return;
    }
    if (msg.role === 'owner' && msg.message.startsWith('/unmod ')) {
      const target = msg.message.split(' ')[1];
      await supabase.from('Acounts').update({ role: 'member' }).eq('username', target);
      io.emit('sendSystem', `${target} has been demoted to Member!`);
      return;
    }

    messages.push(msg);
    io.emit('newMessage', msg);
  });

  socket.on('kickUser', (data) => {
    io.emit('sendSystem', `${data.target} has been kicked (temporary).`);
  });

  socket.on('clearMessages', () => {
    messages = [];
    io.emit('clearMessages');
  });
});

app.get('/messages', (req, res) => res.json(messages));

server.listen(3000, () => console.log('Server running on port 3000'));

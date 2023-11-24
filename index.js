const express = require('express');
const multer = require('multer');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const port = 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const notesFile = path.join(__dirname, 'notes.json');

async function checkFileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

async function createFileIfNotExists(filePath, initialData) {
  const fileExists = await checkFileExists(filePath);
  if (!fileExists) {
    await fs.writeFile(filePath, initialData);
  }
}

createFileIfNotExists(notesFile, '[]')
  .then(() => console.log('Файл з нотатками успішно створено або він вже існує.'))
  .catch((error) => console.error('Помилка створення файлу з нотатками:', error));


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname);
  },
  filename: function (req, file, cb) {
    cb(null, 'notes.json');
  },
});

const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  res.send('Сервер успішно запущено...');
});

app.get('/UploadForm.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'UploadForm.html'));
});

app.get('/notes', async (req, res) => {
  try {
    const data = await fs.readFile(notesFile, 'utf-8');
    const notes = JSON.parse(data) || [];
    res.json(notes);
  } catch (error) {
    console.error('Помилка читання файлу з нотатками:', error);
    res.status(500).send('Внутрішня помилка сервера');
  }
});

app.get('/notes/:note_name', async (req, res) => {
  try {
    const note_name = req.params.note_name;
    const data = await fs.readFile(notesFile, 'utf-8');
    const notes = JSON.parse(data) || [];
    const foundNote = notes.find((note) => note.note_name === note_name);

    if (foundNote) {
      res.send(foundNote.note);
    } else {
      res.status(404).send('Нотатку не знайдено.');
    }
  } catch (error) {
    console.error('Помилка читання нотатки:', error);
    res.status(500).send('Внутрішня помилка сервера');
  }
});

app.post('/upload', upload.single('note'), async (req, res) => {
  try {
    const { note_name, note } = req.body;
    const data = await fs.readFile(notesFile, 'utf-8');
    const notes = JSON.parse(data) || [];

    const existingNote = notes.find((note) => note.note_name === note_name);

    if (existingNote) {
      res.status(400).send('Нотатка з таким ім\'ям вже існує');
    } else {
      notes.push({ note_name: note_name, note: note });
      await fs.writeFile(notesFile, JSON.stringify(notes));
      res.status(201).send('Нотатку успішно завантажено.');
    }
  } catch (error) {
    console.error('Помилка завантаження нотатки:', error);
    res.status(500).send('Внутрішня помилка сервера');
  }
});

app.put('/notes/:note_name', (req, res) => {
  const note_name = req.params.note_name;
  let requestBody = '';

  req.on('data', chunk => {
    requestBody += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const updatedNoteText = requestBody.trim();
      
      if (!note_name || !note_name.trim()) {
        return res.status(400).send('Будь ласка, введіть назву нотатки.');
      }
      
      const data = await fs.readFile(notesFile, 'utf-8');
      let notes = JSON.parse(data) || [];

      const noteToUpdate = notes.find((note) => note.note_name === note_name);

      if (noteToUpdate) {
        noteToUpdate.note = updatedNoteText;
        await fs.writeFile(notesFile, JSON.stringify(notes));
        res.status(200).send('Нотатку успішно оновлено.');
      } else {
        res.status(404).send('Нотатку не знайдено.');
      }
    } catch (error) {
      console.error('Помилка оновлення нотатки:', error);
      res.status(500).send('Внутрішня помилка сервера');
    }
  });
});


  
app.delete('/notes/:note_name', async (req, res) => {
  try {
    const note_name = req.params.note_name;
    const data = await fs.readFile(notesFile, 'utf-8');
    let notes = JSON.parse(data) || [];

    const noteIndex = notes.findIndex((note) => note.note_name === note_name);

    if (noteIndex !== -1) {
      notes.splice(noteIndex, 1);
      await fs.writeFile(notesFile, JSON.stringify(notes));
      res.status(200).send('Нотатку успішно видалено');
    } else {
      res.status(404).send('Нотатку не знайдено.');
    }
  } catch (error) {
    console.error('Помилка видалення нотатки:', error);
    res.status(500).send('Внутрішня помилка сервера');
  }
});

app.listen(port, () => {
  console.log(`Сервер запущено на ${port}`);
});

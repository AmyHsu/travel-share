import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import {promises as fs} from 'node:fs';
import {randomUUID} from 'node:crypto';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json({ limit: '50mb' }));

const UPLOADS_DIR = join(browserDistFolder, 'uploads');
const DATA_FILE = join(import.meta.dirname, '../data.json');

// Ensure uploads directory exists
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(console.error);

async function getRecords() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveRecords(records: unknown[]) {
  await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2));
}

app.get('/api/records', async (req, res) => {
  const records = await getRecords();
  res.json(records);
});

app.get('/api/records/:id', async (req, res) => {
  const records = await getRecords();
  const record = records.find((r: { id: string }) => r.id === req.params.id);
  if (record) {
    res.json(record);
  } else {
    res.status(404).json({ error: 'Record not found' });
  }
});

app.put('/api/records/:id', async (req, res) => {
  try {
    const { title, content, rating, date, photos } = req.body;
    const recordId = req.params.id;
    const records = await getRecords();
    const recordIndex = records.findIndex((r: { id: string }) => r.id === recordId);

    if (recordIndex === -1) {
      res.status(404).json({ error: 'Record not found' });
      return;
    }

    const existingRecord = records[recordIndex];
    const savedPhotos: string[] = [];
    
    if (photos && photos.length > 0) {
      const dateFolder = join(UPLOADS_DIR, date);
      await fs.mkdir(dateFolder, { recursive: true });
      const recordFolder = join(dateFolder, recordId);
      await fs.mkdir(recordFolder, { recursive: true });
      
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        if (photo.data.startsWith('data:')) {
          const matches = photo.data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const buffer = Buffer.from(matches[2], 'base64');
            const ext = photo.name.split('.').pop() || 'jpg';
            const fileName = `${Date.now()}_${i}.${ext}`;
            const filePath = join(recordFolder, fileName);
            await fs.writeFile(filePath, buffer);
            savedPhotos.push(`/uploads/${date}/${recordId}/${fileName}`);
          }
        } else {
          savedPhotos.push(photo.data);
        }
      }
    }

    const updatedRecord = {
      ...existingRecord,
      title,
      content,
      rating,
      date,
      photos: savedPhotos,
      updatedAt: new Date().toISOString()
    };

    records[recordIndex] = updatedRecord;
    await saveRecords(records);
    res.json(updatedRecord);
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: 'Failed to update record' });
  }
});

app.delete('/api/records/:id', async (req, res) => {
  try {
    const recordId = req.params.id;
    const records = await getRecords();
    const recordIndex = records.findIndex((r: { id: string }) => r.id === recordId);

    if (recordIndex === -1) {
      res.status(404).json({ error: 'Record not found' });
      return;
    }

    records.splice(recordIndex, 1);
    await saveRecords(records);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

app.post('/api/records', async (req, res) => {
  try {
    const { title, content, rating, date, photos } = req.body;
    
    const recordId = randomUUID();
    const savedPhotos: string[] = [];
    
    if (photos && photos.length > 0) {
      // Create date folder
      const dateFolder = join(UPLOADS_DIR, date);
      await fs.mkdir(dateFolder, { recursive: true });
      
      // Create record folder inside date folder using recordId to avoid collisions
      const recordFolder = join(dateFolder, recordId);
      await fs.mkdir(recordFolder, { recursive: true });
      
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const matches = photo.data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], 'base64');
          const ext = photo.name.split('.').pop() || 'jpg';
          const fileName = `${i + 1}.${ext}`;
          const filePath = join(recordFolder, fileName);
          await fs.writeFile(filePath, buffer);
          
          savedPhotos.push(`/uploads/${date}/${recordId}/${fileName}`);
        }
      }
    }
    
    const newRecord = {
      id: recordId,
      title,
      content,
      rating,
      date,
      photos: savedPhotos,
      createdAt: new Date().toISOString()
    };
    
    const records = await getRecords();
    records.unshift(newRecord);
    await saveRecords(records);
    
    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Error saving record:', error);
    res.status(500).json({ error: 'Failed to save record' });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

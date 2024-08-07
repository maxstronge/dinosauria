import express from 'express';
import cors from 'cors';
import dinosaurRoutes from './routes/dinosaurRoutes';

const app = express();

app.use(express.json());

// Base route
app.get('/', (req, res) => {
    res.send('Welcome to Dinosauria API');
});

// Enable CORS
app.use(cors());

// Use dinosaur routes
app.use('/api', dinosaurRoutes);

export default app;
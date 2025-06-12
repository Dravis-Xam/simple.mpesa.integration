import express from 'express';
import cors from 'cors';
import pay from './route/pay.js';

const app = express();

app.use(cors(
   {origin: 'http://localhost:5173'}
));
/*
app.use((req, res, next) => {
  let data = '';
  req.on('data', chunk => data += chunk);
  req.on('end', () => {
    console.log('Raw body:', data);
    next();
  });
});
*/
app.use(express.json()); 

app.use(express.urlencoded({ extended: true }));

app.use('/api/buy', pay);

const port = 5000

app.listen(port, ()=>console.log(`listening at port ${port}`))

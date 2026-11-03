
import express from 'express'

import 'dotenv/config'
import { MongoClient, ObjectId } from "mongodb";
import cors from 'cors'
import { createRemoteJWKSet, jwtVerify } from 'jose';

const app = express()
const port = 8000


app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.MONGODB_URL);
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
const momgo_client = await connectToMongoDB();
const db = momgo_client.db("amr_studio");
const studiocollection = db.collection("studio");
const bookingcollection = db.collection("booking");

// const verifyApi =  async(req, res, next) => {
//  const authHeader = req.headers.authorization;
//   console.log(authHeader)
//   if(!authHeader){
//     return res.status(401).send({message:"Unauthorized access"})
//   }


//   const token = authHeader.split(" ")[1]
//   if(!token){
//     return res.status(401).send({message:"Unauthorized access"})
//   }

//   const JWKS = createRemoteJWKSet(new URL('http://localhost:3000/api/auth/jwks'));
//   try {
//     const { payload } = await jwtVerify(token, JWKS);
//     next();
//   } catch (err) {
//     console.error(err);
//     return res.status(401).send({ message: "Unauthorized access" });
//   }
// };

app.post( '/add-studio',verifyApi,  async (req, res)=>{
  const data = req.body
 const result =  await studiocollection.insertOne(data)
 console.log(result)
 res.send(result)
})

app.get( '/get-studios',async (req, res)=>{
  const result =  await studiocollection.find({}).toArray()
  console.log(result)
  res.send(result)
})
app.get("/my-studios/:email",verifyApi, async (req, res) => {
  const { email } = req.params;

  const result = await studiocollection
    .find({ ownerEmail: decodeURIComponent(email) })
    .toArray();

  res.send(result);
});

 app.get( '/get-studio/:id',verifyApi,  async (req, res)=>{
  const {id} = req.params
  const result =  await studiocollection.findOne({_id: new ObjectId(id)})
  res.send(result)
})

app.patch( '/update-studio/:id', verifyApi, async (req, res)=>{
  const {id} = req.params
  const data = req.body
  const result =  await studiocollection.updateOne({_id: new ObjectId(id)},{$set:data})
  res.json(result)
})
app.delete( '/delete-studio/:id',verifyApi, async (req, res)=>{
  const {id} = req.params
  const result =  await studiocollection.deleteOne({_id: new ObjectId(id)})
  res.json(result)
})
app.post('/add-booking', async (req, res) => {
  const data = {
    ...req.body,
    status: "Pending",
    createdAt: new Date()
  };

  const result = await bookingcollection.insertOne(data);

  console.log(result);
  res.send(result);
});
app.post("/add-booking",verifyApi,  async (req, res) => {
  const { studioId, bookingDate, startTime, hours } = req.body;

  const bookings = await bookingcollection.find({
  studioId,
  bookingDate,
  status: { $ne: "Cancelled" },
}).toArray();

  const toMinutes = (time) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const start = toMinutes(startTime);
  const end = start + Number(hours) * 60;

  const conflict = bookings.some((b) => {
    const oldStart = toMinutes(b.startTime);
    const oldEnd = oldStart + Number(b.hours) * 60;

    return start < oldEnd && end > oldStart;
  });

  if (conflict) {
    return res.status(409).send({ message: "Already booked!" });
  }

  await bookingcollection.insertOne({
    ...req.body,
    status: "Pending",
    createdAt: new Date(),
  });

  res.send({ success: true });
});


app.get("/get-bookings/:email",verifyApi,  async (req, res) => {
  const bookings = await bookingcollection.find({
    email: decodeURIComponent(req.params.email),
  }).sort({ createdAt: -1 }).toArray();

  res.send(bookings);
});
app.get('/get-bookings/:email', async (req, res) => {
  const { email } = req.params;

  const result = await bookingcollection
    .find({
      email: email,
      status: { $ne: "Cancelled" }
    })
    .sort({ createdAt: -1 })
    .toArray();

  console.log(result);
  res.send(result);
});
app.patch('/cancel-booking/:id', async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({
      message: "Invalid booking ID"
    });
  }

  const result = await bookingcollection.updateOne(
    {
      _id: new ObjectId(id),
      status: "Pending"
    },
    {
      $set: {
        status: "Cancelled"
      }
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).send({
      message: "Pending booking not found"
    });
  }

  res.send({
    success: true,
    message: "Booking cancelled successfully"
  });
});
// app.patch("/cancel-booking/:id", verifyApi, async (req, res) => {
//   await bookingcollection.updateOne(
//     {
//       _id: new ObjectId(req.params.id),
//       status: "Pending",
//     },
//     {
//       $set: { status: "Cancelled" },
//   });

//   res.send({ success: true });
// });


// app.get("/featured-studios", async (req, res) => {
//   try {
//     const studios = await studiocollection
//       .find()
//       .sort({ rating: -1 })
//       .limit(6)
//       .toArray();

//     res.send(studios);
//   } catch (error) {
//     res.status(500).send({
//       message: "Failed to fetch featured studios",
//     });
//   }
// });

//http://localhost:8000/get-bookings
app.get('/',(req, res) => {
  res.json('server is run!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
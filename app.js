const express = require('express');
const app = express();
const studentRoute = require('./routes/studentRoute');
const userRoute = require('./routes/userRoute')
const { refreshIPCache } = require("./utils/cacheIP");
const ipRoutes = require("./routes/ipRoutes");
const { refreshAllProfilesCache } = require("./utils/profileUtil");



const PORT = 3000

app.use(express.json());  



// Load all IPs into Redis when server starts
refreshIPCache().then(() => {
  console.log("Office IP cache loaded!");
});



(async () => {
  await refreshAllProfilesCache();
})();


app.use('/students', studentRoute);

app.use('/users',userRoute)

app.use("/ip", ipRoutes);


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
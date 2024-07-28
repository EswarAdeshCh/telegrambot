const TelegramBot = require("node-telegram-bot-api");
const request = require("request");
const admin = require("firebase-admin");
const serviceAccount = require("./key.json");
const { tok } = require("./config");

if (!tok) {
  console.error("Telegram Bot Token not provided!");
  process.exit(1);
}

const bot = new TelegramBot(tok, { polling: true });

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Welcome to my bot. Here you can get info about exercises. Please enter the name of a valid exercise. To know different types of exercises, enter 'MUSCLE'."
  );
});

bot.onText(/muscle/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "abdominals\nabductors\nadductors\nbiceps\ncalves\nchest\nforearms\nglutes\nhamstrings\nlats\nlower_back\nmiddle_back\nneck\nquadriceps\ntraps\ntriceps\nEnter any one of the above to get info about them"
  );
});

bot.on("message", (msg) => {
  const exe = msg.text.toLowerCase();

  if (exe === "/start" || exe === "muscle") return;

  request.get(
    {
      url: `https://api.api-ninjas.com/v1/exercises?muscle=${exe}`,
      headers: {
        "X-Api-Key": "JH4Qc7flD4HhM/GWKKLNEw==gqL6pSIYoyUnF2zK",
      },
    },
    (error, response, body) => {
      if (error) {
        return bot.sendMessage(
          msg.chat.id,
          "An error occurred while fetching exercise info."
        );
      }

      const exercises = JSON.parse(body);
      if (exercises[0]) {
        const randomIndex = Math.floor(Math.random() * exercises.length);
        const randomExercise = exercises[randomIndex];
        const exerciseInfo = `Exercise Info:\nName: ${randomExercise.name}\n\nEquipment: ${randomExercise.equipment}\n\nDifficulty: ${randomExercise.difficulty}\n\nInstructions:\n ${randomExercise.instructions}`;

        bot.sendMessage(msg.chat.id, exerciseInfo);

        // Store exercise info in Firestore
        db.collection("exerciseInfo")
          .add({
            name: randomExercise.name,
            equipment: randomExercise.equipment,
            difficulty: randomExercise.difficulty,
            instructions: randomExercise.instructions,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          })
          .then((docRef) => {
            console.log("Exercise info written with ID: ", docRef.id);
          })
          .catch((error) => {
            console.error("Error adding exercise info: ", error);
          });
      } else {
        bot.sendMessage(
          msg.chat.id,
          "No such exercise types are present here.\nPlease enter 'muscle' to get different types of exercises and then enter one of them to get its info."
        );
      }
    }
  );
});

console.log("Bot is running...");

const mongoose = require("mongoose");
import { User } from "./models/User";
let connectedToDB = false;

export function connectToMongo() {
	if (!connectedToDB) {
		mongoose.connect(process.env.MONGO_URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		const db = mongoose.connection;
		db.on("error", console.error.bind(console, "connection error:"));
		db.once("open", function () {
			// we're connected!
			console.log("Connected to MongoDB");
		});
		connectedToDB = true;
	} else {
		console.log("Already connected");
	}
}

export function handleStar() {}

export function checkIfUser(username) {
	User.findOne({ username: username }).exec(function (err, user) {
		if (user) {
			return;
		} else {
			const newUser = new User({
				username: username,
				stars: 2,
				amountGiven: 0,
			});

			newUser.save((err) => {
				if (err) {
					console.log(err);
				}
				console.log("User Created");
			});
		}
	});
}

export async function userHasEnoughStars(username, starsSent) {
	await User.findOne({ username: username }).exec((err, user) => {
		if (!user) {
			console.log("There's been an error, you're not a user");
		}

		if (user.stars < starsSent) {
			console.log(user.stars);
			console.log(starsSent);
			return false;
		}
		return true;
	});
}

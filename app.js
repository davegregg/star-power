require("dotenv").config();

import {
	connectToMongo,
	handleStar,
	checkIfUser,
	userHasEnoughStars,
} from "./backend/main";

const { WebClient } = require("@slack/web-api");
const { createEventAdapter } = require("@slack/events-api");
const port = 3000;
const emoji = ":star-power:";
const prefix = "!";

const slackEvents = createEventAdapter(process.env.SIGNING_SECRET);
const slackClient = new WebClient(process.env.SLACK_TOKEN);

slackEvents.on("app_mention", (event) => {
	slackClient.chat.postMessage({
		channel: event.channel,
		text: `Help Message`,
	});
});

// TODO: Handle replies in thread
slackEvents.on("message", (event) => {
	let message = event.text;
	let sender = event.user;
	checkIfUser(sender);

	if (message.includes(emoji)) {
		let starsSent = message.match(/:star-power:/gi).length;
		let usersMentioned = message.split("@").length - 1;
		let channel = slackClient.chat;
		
		if (!userHasEnoughStars(sender, starsSent)) {
			channel.postMessage({
				channel: event.channel,
				text: "You don't have enough stars!",
			});
			return;
		}

		// Check if there is an even way to split stars with multiple people
		if (usersMentioned > 1) {
			if (starsSent % usersMentioned !== 0) {
				channel.postMessage({
					channel: event.channel,
					text: `I can't split evenly between all the mentioned users, please try again`,
				});
				return;
			}
		}
	}
});

slackEvents.on("error", console.error);

slackEvents.start(port).then(() => {
	console.log(`Server started on port ${port}!`);
	connectToMongo();
});

require("dotenv").config();

import {
	connectToMongo,
	checkIfUser,
	userHasEnoughStars,
	handleTransaction,
} from "./backend/main";
import handleMessage from "./handleMessage";

const { WebClient } = require("@slack/web-api");
const { createEventAdapter } = require("@slack/events-api");
const port = 3000;
const emoji = ":star-power:";
const prefix = "!";

const slackEvents = createEventAdapter(process.env.SIGNING_SECRET);
const slackClient = new WebClient(process.env.SLACK_TOKEN);

// slackEvents.on("app_mention", (event) => {
// 	slackClient.chat.postMessage({
// 		channel: event.channel,
// 		text: `Help Message`,
// 	});
// });

// TODO: Handle replies in thread
slackEvents.on("message", (event) => {
	let message = event.text;
	let sender = event.user;
	checkIfUser(sender);
	if (event.channel_type === "im") {
		if (message[0] === prefix) {
			handleMessage(message, slackClient, event);
			return;
		}
	}
	// console.log(message);
	if (event.channel_type === "channel") {
		if (message.includes(emoji)) {
			let starsSent = message.match(/:star-power:/gi).length;
			let usersMentioned = message.match(/@\w+/gm);
			let channel = slackClient.chat;

			if (!usersMentioned) {
				channel.postEphemeral({
					channel: event.channel,
					text:
						"I can't give any stars because you didn't @ anyone in your shoutout",
					user: event.user,
				});
				return;
			}
			for (let x of usersMentioned) {
				if (x.includes(sender)) {
					channel.postEphemeral({
						channel: event.channel,
						user: event.user,
						text: "You can't send stars to yourself.",
					});
					return;
				}
			}
			// check to make sure user has enough stars
			let flag = false;
			userHasEnoughStars(sender, starsSent).then((userHasEnough) => {
				if (!userHasEnough) {
					channel.postEphemeral({
						channel: event.channel,
						text:
							"You don't have enough stars :( DM me and say !balance to see how many stars you have.",
						user: event.user,
					});
					flag = true;
					return;
				}
			});

			// Check if there is an even way to split stars with multiple people
			if (usersMentioned.length > 1) {
				if (starsSent % usersMentioned.length !== 0) {
					channel.postEphemeral({
						channel: event.channel,
						text: `I can't split the stars evenly between all the mentioned users, please try again`,
						user: event.user,
					});
					return;
				}
			}
			let sanitizedUsers = [];
			for (let user of usersMentioned) {
				if (user[0] === "@") {
					user = user.substring(1);
					sanitizedUsers.push(user);
				}
			}
			setTimeout(() => {
				if (flag === false) {
					handleTransaction(sender, sanitizedUsers, starsSent).then(
						(success) => {
							if (success) {
								channel.postEphemeral({
									channel: event.channel,
									text: `Thanks for sharing! Your stars have been sent. DM me '!help' to see my other features`,
									user: event.user,
								});
							} else {
								channel.postEphemeral({
									channel: event.channel,
									text: `I couldn't find one of the users you mentioned.`,
									user: event.user,
								});
							}
						}
					);
				}
			}, 2000);
		}
	}
});

slackEvents.on("error", console.error);

slackEvents.start(port).then(() => {
	console.log(`Server started on port ${port}!`);
	connectToMongo();
});

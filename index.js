require('dotenv').config();

const { Autohook } = require('twitter-autohook');
const util = require('util');
const request = require('request');
const url = require('url');
const http = require('http');

const oAuthConfig = {
  token: process.env.TWITTER_ACCESS_TOKEN,
  token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
};

const post = util.promisify(request.post);

async function sayHi(event) {
  // We check that the message is a direct message
  if (!event.direct_message_events) {
    return;
  }

  // Messages are wrapped in an array, so we'll extract the first element
  const message = event.direct_message_events.shift();

  // We check that the message is valid
  if (typeof message === 'undefined' || typeof message.message_create === 'undefined') {
    return;
  }
 
  // We filter out message you send, to avoid an infinite loop
  if (message.message_create.sender_id === message.message_create.target.recipient_id) {
    return;
  }

    // Prepare and send the message reply
    const senderScreenName = event.users[message.message_create.sender_id].screen_name;

    const requestConfig = {
      url: 'https://api.twitter.com/1.1/direct_messages/events/new.json',
      oauth: oAuthConfig,
      json: {
        event: {
          type: 'message_create',
          message_create: {
            target: {
              recipient_id: message.message_create.sender_id,
            },
            message_data: {
              text: `Hi @${senderScreenName}! 👋`,
            },
          },
        },
      },
    };
    await post(requestConfig);
}

async function sayHello(event) {

  const sender_id = event.follow_events[0].source.id;
  console.log(sender_id)

  const requestConfig = {
    url: 'https://api.twitter.com/1.1/direct_messages/events/new.json',
    oauth: oAuthConfig,
    json: {
      event: {
        type: 'message_create',
        message_create: {
          target: {
            recipient_id: sender_id,
          },
          message_data: {
            text: `There is no secret ingredient`,
          },
        },
      },
    },
  };
  await post(requestConfig);
}

(async start => {
  try {
    const webhook = new Autohook();

    webhook.on('event', async event => {
      if (event.follow_events) {
        await sayHello(event)
      }

      if (event.direct_message_events) {
        await sayHi(event);
      }
    });

    
    
    // Removes existing webhooks
    await webhook.removeWebhooks();
    
    // Starts a server and adds a new webhook
    await webhook.start();
    
    // Subscribes to your own user's activity
    await webhook.subscribe({oauth_token: process.env.TWITTER_ACCESS_TOKEN, oauth_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET});  
  } catch (e) {
    // Display the error and quit
    console.error(e);
    process.exit(1);
  }
})();  

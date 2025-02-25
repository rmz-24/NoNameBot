let currentCount = 0;
let lastAuthorId = ''; // Store the ID of the user who last counted
/**
 * Processes a message for the counting game.
 *
 * @param {Message} message - The Discord message object.
 * @param {string} countingChannelId - The ID of the channel where counting takes place.
 */
async function handleCounting(message, countingChannelId) {
  // Only process messages in the designated counting channel
  if (message.channel.id !== countingChannelId) return;

  // Attempt to parse the message as a number
 let number = Number(message.content);
  if (isNaN(number)) {
    return;
  }

  // Check if the number is the correct next count
if (number === currentCount + 1 ||Math.abs((currentCount+1)-number)<=0.5) {
    // Prevent the same user from counting twice in a row
    if (message.author.id === lastAuthorId) {
      await message.react('❌');
      await message.channel.send("You cannot count twice in a row! The count has been reset.");
      currentCount = 0;
      lastAuthorId = '';
    } else {
      currentCount++;
      
      lastAuthorId = message.author.id;
      console.log(`Count updated: ${currentCount}`);
      await message.react('✅');
    }
  } else {
    // Incorrect number: notify the user and reset the count
    try {
      await message.react('❌');
      await message.channel.send(`Wrong number! The next number should be **${currentCount + 1}**.`);
      await message.channel.send("The count has been reset.");
      currentCount = 0;
      lastAuthorId = '';
    } catch (err) {
      console.error('Error sending message:', err);
    }
  }
}
module.exports = { handleCounting };
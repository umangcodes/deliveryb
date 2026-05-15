const deliveredMessage = `Ilaxi Foods - Delivery
🎉 Your Package has arrived!
`

const gg = `Grain & Greens - Delivery

Hello! Your Package from Grain & Greens has been delivered! Please retrieve it at your earliest conveninence.

Thanks,
G&G Team
`

const clientDeliveryMessage = (client) => `${client} - Delivery
Hello! Your Package from ${client} has been delivered! Please retrieve it at your earliest conveninence.`
module.exports = {deliveredMessage, gg, clientDeliveryMessage}
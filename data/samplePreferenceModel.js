module.exports = (email = 'test.user@alexa.ai') => {
    return {
        basePreferences: {
            maxMileage: 60000,
            maxPrice: 40000,
            minYear: 2005,
            bodyStyles: ['suv', 'sedan'],
            conditions: ['used'],
            zip: 30331
        },
        dislikes: [{},{}], //json objects from response array of car listings
        likes: [{}], //json objects from response array of car listings
    }
}
module.exports = (email = 'test.user@alexa.ai') => {
    return {
        basePreferences: {
            maxMileage: 60000,
            maxPrice: 40000,
            minYear: 2005,
            bodyStyles: ['suv', 'sedan'],
            conditions: ['used'],
            zip: '30331'
        },
        dislikes: [
            {
                url: '',
                vin: '',
                reasons: {
                    color: 'green'
                }
            },
            {
                url: '',
                vin: '',
                reasons: {
                    bodyStyle: 'suv/crossover'
                }
            },
            {
                url: '',
                vin: '',
                reasons: {
                    bodyStyle: 'van/minivan'
                }
            },                        
            {
                url: '',
                vin: '',
                reasons: {
                    miles: 77888
                }
            },
            {
                url: '',
                vin: '',
                reasons: {
                    miles: 97888
                }
            },
            {
                url: '',
                vin: '',
                reasons: {
                    year: 2008
                }
            },
            {
                url: '',
                vin: '',
                reasons: {
                    price: 90000
                }
            },
            {
                url: '',
                vin: '',
                reasons: {
                    price: 70000
                }
            },
            {
                url: '',
                vin: '',
                reasons: {
                    price: 53000
                }
            },
            {
                url: '',
                vin: '',
                reasons: {
                    year: 2000
                }
            },
            {
                url: '',
                vin: '',
                reasons: {
                    model: 'prius'
                }
            }
        ],
        saved: [
            {
                url: '',
                vin: '',
            }
        ]
    }
}
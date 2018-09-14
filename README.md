# Car Shopper

Car Shopper is an app designed for the Echo Show App that enables a user to search for cars via voice commands. The idea is to allow for a more natural car searching experience. When car searching online you are typically required to set filters to see the cars you want. However, when filters are set you can easily miss out on good cars that may not fit into your filter set. The Car Shopper app is intended to act like a virtual salesman. As Car Shopper shows you cars you can respond by saying that you like or dislike a car. As your history grows Car Shopper will analyze your like and dislike history to show you cars that you are more likely to like. 

# Available Commands:

Start app
  > Alexa, start 'Car Shopper'

Perform car search (only requires a city be set)
  > Alexa, peform car search now

Set base preferences to improve suggestion algorithm (all base prefences are optional except city)
These are persisted. you can quit and come back at any time  
  > Alexa, update city (required)
   
  > Alexa, update body styles
   
  > Alexa, update min year
   
  > Alexa, update conditions
   
  > Alexa, update max price
   
  > Alexa, update max mileage
 
  > Alexa, update makes

To clear preferences (City cannot be cleared once set. It can be updated)   
  > Alexa, clear body styles
   
  > Alexa, clear min year
   
  > Alexa, clear conditions
   
  > Alexa, clear max price
   
  > Alexa, clear max mileage
 
  > Alexa, clear makes  

Show base preferences
  > Alexa, show me my preferences

Review like history
  > Alexa, show me my likes
  
Reset base preferences and clear like/dislike history (This allows you to start everything over. Intent is not confirmed.)
  > Alexa, reset app data
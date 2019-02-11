# Ballooning with Three.js
This was developed as a study into procedural terrains, buffer geometry optimisation and shadow mappers with Three.js and WebGL.
I had some grand plans for the application, but they were never realised so it's probably more useful to just release it as it is for others to take a look!
There are plenty of issues with it and it's pretty rough having been developed over 2 years ago now, but if it's some use to anyone that's great.

## Features
- Procedurally generated infinite terrain
- Happy flapping birds
- Shore detection algorithms for boathouse placement
- Pleasant mountain ballooning
- Performant statically batched tree rendering
- Runs on desktop and mobile

## Development
Feel free to have a dig around in the code and change things. I've setup a [webpack](https://webpack.js.org/) development environment with hot module replacement that you can use to quickly iterate the application.
- Ensure that you have node and npm installed on your machine. You can follow the official instructions at https://www.npmjs.com/get-npm
- Clone the repository into your desired project folder
- Run `npm install` from within the project folder to install dependencies
- Run `npm start`. This will spin up a webpack development server running at http://localhost:8080
- Change the code you like and see what happens!

## Building
- Run `npm run build` to build a production ready version of the web app.
- Contents will be processed into /dist, which you can upload to your web server.

## License
MIT

## Warranty
None whatsoever.

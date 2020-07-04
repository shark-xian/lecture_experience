/* eslint-disable no-shadow */
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { app } = require('./servers');
const redisClient = require('./servers').client;
const { logger } = require('./services/logger/logger');
const Stats = require('./models/stats');
const Manager = require('./models/manager');
const Room = require('./models/room');

const publicPath = path.join(__dirname, '../public');

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('/testjanus', (req, res) => {
  res.sendFile('testjanus.html', { root: path.join(publicPath) });
});

app.get('/create', (req, res) => {
  res.sendFile('create.html', { root: path.join(publicPath) });
});

app.post('/create', (req, res) => {
  logger.info('POST request received: /create');
  const managerId = uuidv4();
  const { name, email, roomId } = req.body;
  const newLectureStats = new Stats(name);
  newLectureStats.addUserTrack(new Date(), 0);
  redisClient.hmset('stats', { [roomId]: JSON.stringify(newLectureStats) });
  redisClient.hmset('rooms', { [roomId]: JSON.stringify(new Room(name, managerId)) });
  redisClient.hmset('managers', { [managerId]: JSON.stringify(new Manager(roomId, email)) });

  logger.info('POST /create successfully added room and manager id to redis');
  const redirectUrl = `/lecture/${managerId}`;
  res.status(200);
  res.send({ redirectUrl });
});

app.get('/validate/lecture', (req, res) => {
  logger.info(`GET request received: /validate/lecture for sessionId ${req.sessionId}`);
  redisClient.hexists('managers', req.query.id, (err, roomExist) => {
    if (roomExist) {
      if (req.session.inRoom) {
        res.status(401);
        res.json({ error: 'User already connected on different tab' });
      } else {
        res.status(200);
        res.json({ success: 'User is ready to be connected' });
      }
    } else {
      res.status(404);
      res.json({ error: 'Lecture does not exist' });
    }
  });
});

app.get('/lecture/:id', (req, res) => {
  const urlId = req.params.id;
  logger.info(`GET request received: /lecture for lecture id: ${urlId}`);

  redisClient.hmget('managers', urlId, (err, object) => {
    const isGuest = object[0] === null;
    const roomId = !isGuest && JSON.parse(object[0]).roomId;
    redisClient.hexists('rooms', isGuest ? urlId : roomId, (err, roomExist) => {
      if (roomExist) {
        res.sendFile(isGuest
          ? 'lecture.html' : 'whiteboard.html',
        { root: publicPath });
      } else {
        res.status(404);
        res.redirect(301, '/error?code=3');
      }
    });
  });
});

app.get('/lecture/stats/:id', (req, res) => {
  const urlId = req.params.id;
  logger.info(`GET request received: /lecture/stats for lecture id: ${urlId}`);
  const renderNotFound = () => res.status(404).redirect(301, '/error?code=3');
  redisClient.hexists('rooms', urlId, (er, roomExist) => {
    if (roomExist) {
      renderNotFound();
    } else {
      redisClient.hexists('stats', urlId, (er, statsExist) => {
        if (statsExist) {
          res.sendFile('stats.html', { root: path.join(publicPath) });
        } else {
          renderNotFound();
        }
      });
    }
  });
});

app.post('/lecture/stats/:id', (req, res) => {
  const urlId = req.params.id;
  logger.info(`POST request received: /lecture/stats for lecture id: ${urlId}`);
  redisClient.hmget('stats', urlId, (err, statsJson) => {
    if (err === null) {
      res.send(statsJson.pop());
    } else {
      res.status(404);
    }
  });
});

app.get('/error', (req, res) => {
  let errType;
  switch (req.query.code) {
    case '0': errType = null; break;
    case '1': errType = 'PageNotFound'; break;
    case '2': errType = 'InvalidSession'; break;
    case '3': errType = 'LectureNotFound'; break;
    default: break;
  }
  if (errType) {
    res.render('error.html', { [errType]: true });
  } else {
    res.redirect(301, '/');
  }
});

app.get('*', (req, res) => {
  res.redirect(301, '/error?code=1');
});

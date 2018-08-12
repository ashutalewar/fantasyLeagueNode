var express = require('express')
  , fs = require('fs')
  , passport = require('passport')
  , logger = require('mean-logger')
  , session = require('express-session')
  , mongoStore = require('connect-mongo')(session)
  , flash = require('connect-flash')
  , helpers = require('view-helpers')

var compression = require('compression')

var morgan = require('morgan')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var methodOverride = require('method-override')

var env = process.env.NODE_ENV || 'development'
  , config = require('./config/config')[env]
  , auth = require('./config/middlewares/authorization')
  , mongoose = require('mongoose')

var db = mongoose.connect(config.db)

var models_path = __dirname + '/app/models'
fs.readdirSync(models_path).forEach(function (file) {
  require(models_path+'/'+file)
})

require('./config/passport')(passport, config)

var app = express()

  app.set('showStackError', true)
  // should be placed before express.static
  app.use(compression({
    filter: function (req, res) {
      return /json|text|javascript|css/.test(res.getHeader('Content-Type'));
    },
    level: 9
  }))
  // app.use(express.favicon())
  app.use(express.static(config.root + '/public'))

  // don't use logger for test env
  // if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('tiny'))
  // }

  // set views path, template engine and default layout
  app.set('views', config.root + '/app/views')
  app.set('view engine', 'jade')
  
  // enable jsonp
  app.enable("jsonp callback")

    // dynamic helpers
    app.use(helpers(config.app.name))

    // cookieParser should be above session
    app.use(cookieParser())

    // bodyParser should be above methodOverride
    app.use(bodyParser())
    app.use(methodOverride())

    // express/mongo session storage
    app.use(session({
      secret: 'ngFantasyFootball',
      store: new mongoStore({
        url: config.db,
        collection : 'sessions'
      })
    }))

    // connect flash for flash messages
    app.use(flash())

    // use passport session
    app.use(passport.initialize())
    app.use(passport.session())

    // routes should be at the last


  var users = require('./app/controllers/users')
  app.get('/signin', users.signin)
  app.get('/signup', users.signup)
  app.get('/signout', users.signout)
  app.post('/users', users.create)
  app.post('/users/session', passport.authenticate('local', {failureRedirect: '/signin', failureFlash: 'Invalid email or password.'}), users.session)
  app.get('/users/me', users.me)
  app.get('/users/:userId', users.show)
  app.param('userId', users.user)

  // league routes
  var leagues = require('./app/controllers/leagues')
  app.get('/leagues', leagues.all)
  app.post('/leagues', auth.requiresLogin, leagues.create)
  app.get('/leagues/:leagueId', leagues.show)
  app.put('/leagues/:leagueId', auth.requiresLogin, leagues.update)
  app.del('/leagues/:leagueId', auth.requiresLogin, leagues.destroy)
  app.param('leagueId', leagues.league)

  // fantasy team routes
  var fantasyteams = require('./app/controllers/fantasyteams')
  app.get('/fantasyteams', fantasyteams.all)
  app.post('/fantasyteams', auth.requiresLogin, fantasyteams.create)
  app.get('/fantasyteams/:fantasyTeamId', fantasyteams.show)
  app.put('/fantasyteams/:fantasyTeamId', auth.requiresLogin, fantasyteams.update)
  app.del('/fantasyteams/:fantasyTeamId', auth.requiresLogin, fantasyteams.destroy)
  app.param('fantasyTeamId', fantasyteams.fantasyteam)

  // player routes
  var players = require('./app/controllers/players')
  app.get('/players', players.all)
  app.get('/players/:playerId', players.show)
  app.param('playerId', players.player)

  // home route
  var index = require('./app/controllers/index')
  app.get('/', index.render)




    // assume "not found" in the error msgs
    // is a 404. this is somewhat silly, but
    // valid, you can do whatever you like, set
    // properties, use instanceof etc.
    app.use(function(err, req, res, next){
      // treat as 404
      if (~err.message.indexOf('not found')) return next()

      // log it
      console.error(err.stack)

      // error page
      res.status(500).render('500', { error: err.stack })
    })

    // assume 404 since no middleware responded
    app.use(function(req, res, next){
      res.status(404).render('404', { url: req.originalUrl, error: 'Not found' })
    })



var port = process.env.PORT || 3000
app.listen(port)
console.log('Express app started on port '+port)

logger.init(app, passport, mongoose)
exports = module.exports = app

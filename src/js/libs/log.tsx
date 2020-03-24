import log from 'loglevel'

if (process.env.NODE_ENV === 'production') {
  log.setLevel('INFO')
} else {
  log.setLevel('DEBUG')
}

export default log

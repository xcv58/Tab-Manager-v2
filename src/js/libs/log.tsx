import log from 'loglevel'
import { isProduction } from 'libs'

if (isProduction()) {
  log.setLevel('INFO')
} else {
  log.setLevel('DEBUG')
}

export default log

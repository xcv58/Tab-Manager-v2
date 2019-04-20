import { configure } from 'enzyme'
import chrome from 'sinon-chrome/extensions'
import Adapter from 'enzyme-adapter-react-16'

global.chrome = chrome

configure({ adapter: new Adapter() })

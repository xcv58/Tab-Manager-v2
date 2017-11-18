import { configure } from 'enzyme'
import chrome from 'sinon-chrome/extensions'
import Adapter from 'enzyme-adapter-react-16'

configure({ adapter: new Adapter() })
global.chrome = chrome

export * from 'enzyme'
export * from 'sinon'
